import pytest
import torch
from app.growth.graphsage import CommerceGraphBuilder, CommerceGraphSAGE

def test_commerce_graph_construction(db_session):
    """Verify nodes, edges, and index mappings in the commerce graph."""
    builder = CommerceGraphBuilder(feature_dim=64)
    graph_data, prod_idx_map = builder.build_from_database(db_session)

    assert graph_data.x is not None
    assert graph_data.edge_index is not None
    assert graph_data.x.shape[1] == 64
    assert graph_data.edge_index.shape[0] == 2
    assert graph_data.edge_index.shape[1] > 0, "Graph should have edges"

    # All seeded products must be in the index map
    assert len(prod_idx_map) >= 6
    for prod_id, node_idx in prod_idx_map.items():
        assert node_idx < graph_data.x.shape[0]

def test_graphsage_message_passing(db_session):
    """Verify GraphSAGE 2-layer aggregation produces correct 32-dim product representations."""
    builder = CommerceGraphBuilder(feature_dim=64)
    graph_data, prod_idx_map = builder.build_from_database(db_session)

    sage = CommerceGraphSAGE(in_channels=64, hidden_channels=48, out_channels=32)
    sage.eval()

    with torch.no_grad():
        out = sage(graph_data.x, graph_data.edge_index)

    assert out.shape[0] == graph_data.x.shape[0]
    assert out.shape[1] == 32
    assert not torch.isnan(out).any(), "Graph embeddings must not contain NaN"
    assert not torch.isinf(out).any(), "Graph embeddings must not contain Inf"
