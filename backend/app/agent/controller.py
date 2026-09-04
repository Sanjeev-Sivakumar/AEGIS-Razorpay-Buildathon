import json
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.agent.state import AgentState, can_transition
from app.agent.memory import AgentMemory
from app.agent.planner import AgentPlanner
from app.ai.groq_client import get_groq_client
from app.db.models import AgentSession, AgentEvent, QueryIntent, generate_uuid, utc_now
from app.schemas.agent import AgentRunResponse, AgentEventResponse
from app.schemas.intent import IntentExtractionResult

logger = logging.getLogger("aegis.agent.controller")

class AgentController:
    """Orchestrates the Aegis Autonomous Agent State Machine lifecycle."""

    def __init__(self, db: Session):
        self.db = db
        self.groq_client = get_groq_client()
        self.planner = AgentPlanner(db)

    def _emit_event(
        self,
        session_id: str,
        state: AgentState,
        event_type: str,
        message: str,
        payload: Optional[Dict[str, Any]] = None,
        memory: Optional[AgentMemory] = None,
    ) -> AgentEvent:
        """Create and persist an AgentEvent to SQLite."""
        payload_dict = payload or {}
        payload_json = json.dumps(payload_dict)

        event = AgentEvent(
            id=generate_uuid("EVT-"),
            session_id=session_id,
            event_type=event_type,
            state=state.value,
            message=message,
            payload=payload_json,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)

        if memory:
            memory.record_event({
                "id": event.id,
                "session_id": event.session_id,
                "event_type": event.event_type,
                "state": event.state,
                "message": event.message,
                "payload": payload_dict,
                "created_at": event.created_at.isoformat(),
            })

        logger.info(f"[{state.value}] Event '{event_type}': {message}")
        return event

    def run(self, user_input: str, session_id: Optional[str] = None) -> AgentRunResponse:
        """Execute the full Aegis Agent Loop: PERCEIVE -> ANALYZE -> DECIDE -> ACT -> COMPLETED."""
        clean_input = user_input.strip()
        if not clean_input:
            raise ValueError("User request cannot be empty")

        sid = session_id or generate_uuid("AG-")
        session = AgentSession(
            id=sid,
            status="active",
            current_state=AgentState.IDLE.value,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        memory = AgentMemory(session_id=sid, root_request=clean_input)
        persisted_events: List[AgentEventResponse] = []

        def track(evt: AgentEvent):
            persisted_events.append(
                AgentEventResponse(
                    id=evt.id,
                    session_id=evt.session_id,
                    event_type=evt.event_type,
                    state=evt.state,
                    message=evt.message,
                    payload=evt.parsed_payload,
                    created_at=evt.created_at,
                )
            )

        try:
            # =========================================================================
            # STEP 1: PERCEIVE
            # =========================================================================
            session.current_state = AgentState.PERCEIVE.value
            self.db.commit()
            memory.current_state = AgentState.PERCEIVE

            evt = self._emit_event(
                session_id=sid,
                state=AgentState.PERCEIVE,
                event_type="USER_REQUEST_RECEIVED",
                message=f"User request captured: \"{clean_input}\"",
                payload={"raw_text": clean_input},
                memory=memory,
            )
            track(evt)

            # =========================================================================
            # STEP 2: ANALYZE
            # =========================================================================
            session.current_state = AgentState.ANALYZE.value
            self.db.commit()
            memory.current_state = AgentState.ANALYZE

            intent_result: IntentExtractionResult = self.groq_client.extract_intent(clean_input)
            memory.parsed_intent = intent_result

            # Persist QueryIntent record
            query_intent = QueryIntent(
                id=generate_uuid("INT-"),
                raw_text=clean_input,
                category=intent_result.category,
                location=intent_result.location,
                max_budget=intent_result.max_budget,
                currency=intent_result.currency,
                attributes=json.dumps(intent_result.attributes),
                source=intent_result.source,
            )
            self.db.add(query_intent)
            self.db.commit()

            evt = self._emit_event(
                session_id=sid,
                state=AgentState.ANALYZE,
                event_type="INTENT_EXTRACTED",
                message=(
                    f"Intent extracted via {intent_result.source.upper()}: "
                    f"category='{intent_result.category}', "
                    f"location='{intent_result.location}', "
                    f"budget={intent_result.currency} {intent_result.max_budget}"
                ),
                payload={
                    "intent_id": query_intent.id,
                    **intent_result.model_dump(),
                },
                memory=memory,
            )
            track(evt)

            # --- Phase 2 & 3 & 4: Root Intent, Derivation, Payment Gate, Ledger, Growth ---
            from app.services.trust.root_intent import issue_root_intent_certificate
            from app.services.trust.derivation import create_derivation_chain, append_derivation_step
            from app.services.commerce.payment_gate import PaymentGate
            from app.services.ledger.ledger_service import LedgerService
            from app.growth.service import get_growth_service
            from app.db.models import PaymentProposal

            root_cert = issue_root_intent_certificate(
                db=self.db,
                session_id=sid,
                intent_id=query_intent.id,
                category=intent_result.category or "general",
                location=intent_result.location,
                max_amount=intent_result.max_budget,
                currency=intent_result.currency,
                original_text=clean_input,
            )

            evt_cert = self._emit_event(
                session_id=sid,
                state=AgentState.ANALYZE,
                event_type="ROOT_INTENT_CREATED",
                message=f"Root Intent Certificate issued: {root_cert.id} (Hash: {root_cert.immutable_hash[:12]}...)",
                payload={
                    "certificate_id": root_cert.id,
                    "immutable_hash": root_cert.immutable_hash,
                    "signature": root_cert.signature,
                },
                memory=memory,
            )
            track(evt_cert)

            chain = create_derivation_chain(
                db=self.db,
                session_id=sid,
                root_intent_id=root_cert.id,
            )

            append_derivation_step(
                db=self.db,
                chain_id=chain.id,
                action="INTENT_CAPTURE",
                description=f"Captured root intent for {root_cert.category} in {root_cert.location or 'any location'}",
                input_data={"raw_text": clean_input},
                output_data={"category": root_cert.category, "max_amount": root_cert.max_amount},
            )

            evt_deriv = self._emit_event(
                session_id=sid,
                state=AgentState.ANALYZE,
                event_type="DERIVATION_CREATED",
                message=f"Derivation chain initialized: {chain.id}",
                payload={"chain_id": chain.id, "root_intent_id": root_cert.id},
                memory=memory,
            )
            track(evt_deriv)

            # =========================================================================
            # STEP 3: DECIDE
            # =========================================================================
            session.current_state = AgentState.DECIDE.value
            self.db.commit()
            memory.current_state = AgentState.DECIDE

            plan = self.planner.formulate_plan(intent_result)
            memory.record_decision(plan)

            append_derivation_step(
                db=self.db,
                chain_id=chain.id,
                action="SEARCH_INVENTORY",
                description="Queried merchant catalog inventory for matching offerings",
                input_data=plan["target_criteria"],
                output_data={"candidates_count": plan["candidates_count"]},
            )

            append_derivation_step(
                db=self.db,
                chain_id=chain.id,
                action="FILTER_CONSTRAINTS",
                description=f"Evaluated budget cap ({intent_result.currency} {intent_result.max_budget}) and availability",
                input_data={"max_budget": intent_result.max_budget},
                output_data={"eligible_candidates": plan["candidates_count"]},
            )

            evt = self._emit_event(
                session_id=sid,
                state=AgentState.DECIDE,
                event_type="ACTION_DETERMINED",
                message=plan["reasoning"],
                payload={
                    "action": plan["action"],
                    "candidates_count": plan["candidates_count"],
                    "target_criteria": plan["target_criteria"],
                    "next_step": plan["next_step"],
                },
                memory=memory,
            )
            track(evt)

            # =========================================================================
            # STEP 4: ACT & GROWTH RANKING
            # =========================================================================
            candidates = plan["candidates"]

            # Phase 3 Growth Intelligence: Compute AI-Buyer Selection Probability
            if candidates:
                try:
                    growth_svc = get_growth_service()
                    growth_rankings = growth_svc.rank(
                        query=clean_input,
                        product_ids=[c["product_id"] for c in candidates],
                        db=self.db,
                    )
                    if growth_rankings:
                        ranking_map = {r["product_id"]: r for r in growth_rankings}
                        for c in candidates:
                            if c["product_id"] in ranking_map:
                                c["selection_probability"] = ranking_map[c["product_id"]]["selection_probability"]
                                c["rank"] = ranking_map[c["product_id"]]["rank"]
                        candidates.sort(key=lambda x: x.get("selection_probability", 0.0), reverse=True)
                        top_candidate_rank = candidates[0]

                        session.current_state = AgentState.GROW.value
                        self.db.commit()
                        memory.current_state = AgentState.GROW

                        evt_growth = self._emit_event(
                            session_id=sid,
                            state=AgentState.GROW,
                            event_type="GROWTH_RANKING_APPLIED",
                            message=f"Growth Intelligence evaluated {len(candidates)} offerings. Optimal: {top_candidate_rank['name']} (P={top_candidate_rank.get('selection_probability', 0)*100:.1f}%)",
                            payload={
                                "top_product_id": top_candidate_rank["product_id"],
                                "selection_probability": top_candidate_rank.get("selection_probability", 0.0),
                                "model_version": ranking_map[top_candidate_rank["product_id"]]["model_version"],
                            },
                            memory=memory,
                        )
                        track(evt_growth)
                except Exception as e:
                    logger.warning(f"Growth ranking deferred: {e}")

            session.current_state = AgentState.ACT.value
            self.db.commit()
            memory.current_state = AgentState.ACT

            proposal = None
            authorization = None

            if candidates:
                top_cand = candidates[0]
                append_derivation_step(
                    db=self.db,
                    chain_id=chain.id,
                    action="SELECT_OFFERING",
                    description=f"Selected {top_cand['name']} from {top_cand['merchant_name']} at {top_cand['currency']} {top_cand['price']}",
                    input_data={"candidate_id": top_cand["product_id"]},
                    output_data={"price": top_cand["price"], "merchant": top_cand["merchant_name"]},
                )

                # Create PaymentProposal
                proposal = PaymentProposal(
                    id=generate_uuid("PROP-"),
                    session_id=sid,
                    root_intent_id=root_cert.id,
                    merchant_id=top_cand["merchant_id"],
                    product_id=top_cand["product_id"],
                    amount=top_cand["price"],
                    currency=top_cand["currency"],
                    category=top_cand["category"],
                    recipient=top_cand["merchant_name"],
                    description=f"Automated purchase proposal for {top_cand['name']}",
                    derivation_chain_id=chain.id,
                    created_at=utc_now(),
                )
                self.db.add(proposal)
                self.db.commit()
                self.db.refresh(proposal)

                append_derivation_step(
                    db=self.db,
                    chain_id=chain.id,
                    action="PROPOSE_PAYMENT",
                    description=f"Generated PaymentProposal {proposal.id} for {proposal.currency} {proposal.amount}",
                    input_data={"proposal_id": proposal.id},
                    output_data={"amount": proposal.amount, "currency": proposal.currency},
                )

                evt_prop = self._emit_event(
                    session_id=sid,
                    state=AgentState.ACT,
                    event_type="PAYMENT_PROPOSED",
                    message=f"Payment proposed: {proposal.currency} {proposal.amount:,.2f} for {top_cand['name']} to {top_cand['merchant_name']}",
                    payload={
                        "proposal_id": proposal.id,
                        "amount": proposal.amount,
                        "currency": proposal.currency,
                        "merchant": top_cand["merchant_name"],
                    },
                    memory=memory,
                )
                track(evt_prop)

            action_result = {
                "action": "DISCOVERY_AND_PROPOSAL",
                "execution_status": "SUCCESS",
                "candidates": candidates,
                "candidates_count": len(candidates),
                "proposal": {
                    "id": proposal.id,
                    "amount": proposal.amount,
                    "currency": proposal.currency,
                    "recipient": proposal.recipient,
                } if proposal else None,
            }
            memory.action_result = action_result

            evt = self._emit_event(
                session_id=sid,
                state=AgentState.ACT,
                event_type="ACTION_EXECUTED",
                message=f"Executed catalog discovery: retrieved {len(candidates)} candidate offerings and created payment proposal",
                payload={
                    "candidates_count": len(candidates),
                    "candidates": candidates,
                },
                memory=memory,
            )
            track(evt)

            # =========================================================================
            # STEP 5: VERIFY & STEP 6: PAY & AUDIT LEDGER (Phase 2 & 4 Trust Gate)
            # =========================================================================
            if proposal:
                session.current_state = AgentState.VERIFY.value
                self.db.commit()
                memory.current_state = AgentState.VERIFY

                payment_gate = PaymentGate(self.db)
                authorization = payment_gate.process_proposal(proposal.id)

                # Fetch emitted events during payment gate processing
                gate_events = (
                    self.db.query(AgentEvent)
                    .filter(AgentEvent.session_id == sid, AgentEvent.created_at >= evt.created_at)
                    .order_by(AgentEvent.created_at.asc())
                    .all()
                )
                for ge in gate_events:
                    if ge.id != evt.id and not any(pe.id == ge.id for pe in persisted_events):
                        track(ge)

                action_result["authorization"] = {
                    "id": authorization.id,
                    "decision": authorization.decision,
                    "policy_result": authorization.policy_result,
                    "risk_score": authorization.risk_score,
                    "risk_level": authorization.risk_level,
                    "razorpay_order_id": authorization.razorpay_order_id,
                    "reason": authorization.reason,
                }

                # Phase 4: Commit transaction to Append-Only Cryptographic Audit Ledger
                ledger_svc = LedgerService(self.db)
                ledger_entry = ledger_svc.commit_entry(
                    transaction_id=authorization.id,
                    session_id=sid,
                    root_intent_id=root_cert.id,
                    merchant_id=proposal.merchant_id,
                    product_id=proposal.product_id,
                    amount=proposal.amount,
                    currency=proposal.currency,
                    recipient=proposal.recipient,
                    discovery_reason=f"Candidate selected by agent: {top_cand['name']}",
                    verification_reason=authorization.reason,
                    outcome="AUTHORIZED" if authorization.decision == "PASS" else "HELD",
                    risk_score=authorization.risk_score,
                    policy_result=authorization.policy_result,
                    verification_result="PASS" if authorization.decision == "PASS" else "FAIL",
                    razorpay_order_id=authorization.razorpay_order_id,
                )

                evt_ledger = self._emit_event(
                    session_id=sid,
                    state=AgentState.VERIFY,
                    event_type="LEDGER_COMMITTED",
                    message=f"Transaction committed to cryptographic audit ledger: {ledger_entry.id} (hash {ledger_entry.current_hash[:8]}...)",
                    payload={
                        "ledger_entry_id": ledger_entry.id,
                        "current_hash": ledger_entry.current_hash,
                        "previous_hash": ledger_entry.previous_hash,
                        "outcome": ledger_entry.outcome,
                    },
                    memory=memory,
                )
                track(evt_ledger)
                action_result["ledger_entry_id"] = ledger_entry.id

                if authorization.decision == "PASS":
                    session.current_state = AgentState.PAY.value
                    self.db.commit()
                    memory.current_state = AgentState.PAY

                    evt_pay = self._emit_event(
                        session_id=sid,
                        state=AgentState.PAY,
                        event_type="PAYMENT_AUTHORIZED",
                        message=f"PaymentGate authorized transaction with Razorpay order: {authorization.razorpay_order_id}",
                        payload={
                            "razorpay_order_id": authorization.razorpay_order_id,
                            "decision": "PASS",
                        },
                        memory=memory,
                    )
                    track(evt_pay)
                else:
                    session.current_state = AgentState.HOLD.value
                    self.db.commit()
                    memory.current_state = AgentState.HOLD

                    evt_hold = self._emit_event(
                        session_id=sid,
                        state=AgentState.HOLD,
                        event_type="TRANSACTION_HELD",
                        message=f"Transaction held by trust gate: {authorization.reason}",
                        payload={
                            "reason": authorization.reason,
                            "policy_result": authorization.policy_result,
                            "risk_score": authorization.risk_score,
                        },
                        memory=memory,
                    )
                    track(evt_hold)

                    # Break-Glass Escalation Flow
                    session.current_state = AgentState.ESCALATE.value
                    self.db.commit()
                    memory.current_state = AgentState.ESCALATE

                    evt_esc = self._emit_event(
                        session_id=sid,
                        state=AgentState.ESCALATE,
                        event_type="TRANSACTION_ESCALATED",
                        message=f"Forensic escalation: Policy {authorization.policy_result} with risk {authorization.risk_score}/100",
                        payload={
                            "reason": authorization.reason,
                            "risk_level": authorization.risk_level,
                            "policy_result": authorization.policy_result,
                        },
                        memory=memory,
                    )
                    track(evt_esc)

            # =========================================================================
            # STEP 7: COMPLETED & STEP 8: LEARN
            # =========================================================================
            session.current_state = AgentState.COMPLETED.value
            session.status = "completed"
            self.db.commit()
            memory.current_state = AgentState.COMPLETED

            evt = self._emit_event(
                session_id=sid,
                state=AgentState.COMPLETED,
                event_type="SESSION_COMPLETED",
                message="Agent execution completed successfully",
                payload={
                    "status": "completed",
                    "candidates_count": len(candidates),
                    "intent_source": intent_result.source,
                    "authorization_decision": authorization.decision if authorization else "N/A",
                    "razorpay_order_id": authorization.razorpay_order_id if authorization else None,
                },
                memory=memory,
            )
            track(evt)

            # Phase 4: Learn state transition
            session.current_state = AgentState.LEARN.value
            self.db.commit()
            memory.current_state = AgentState.LEARN

            evt_learn = self._emit_event(
                session_id=sid,
                state=AgentState.LEARN,
                event_type="OUTCOME_LEARNED",
                message="Recorded execution outcome for future contextual adaptation",
                payload={
                    "status": "completed",
                    "decision": authorization.decision if authorization else "N/A",
                },
                memory=memory,
            )
            track(evt_learn)

            # Reset back to completed for response schema
            session.current_state = AgentState.COMPLETED.value
            self.db.commit()

            return AgentRunResponse(
                session_id=sid,
                status="completed",
                current_state=AgentState.COMPLETED.value,
                intent=intent_result.model_dump(),
                events=persisted_events,
                result=action_result,
            )

        except Exception as e:
            logger.error(f"Agent execution failed: {e}", exc_info=True)
            session.current_state = AgentState.FAILED.value
            session.status = "failed"
            self.db.commit()

            evt = self._emit_event(
                session_id=sid,
                state=AgentState.FAILED,
                event_type="EXECUTION_FAILED",
                message=f"Agent execution failed: {str(e)}",
                payload={"error": str(e)},
                memory=memory,
            )
            track(evt)

            return AgentRunResponse(
                session_id=sid,
                status="failed",
                current_state=AgentState.FAILED.value,
                intent=memory.parsed_intent.model_dump() if memory.parsed_intent else {},
                events=persisted_events,
                result={"error": str(e)},
            )
