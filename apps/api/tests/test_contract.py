from diorama_api.schemas import GenerateBase, SceneItem


def test_articulation_rejects_high_triangle_count() -> None:
    try:
        GenerateBase(
            name="Chair",
            description="Office chair",
            create_articulation=True,
            triangle_count="high",
        )
    except ValueError as exc:
        assert "minimal or low" in str(exc)
    else:
        raise AssertionError("Expected articulation validation failure")


def test_scene_item_shape() -> None:
    item = SceneItem(
        id="item-1",
        projectId="00000000-0000-0000-0000-000000000000",
        position=(0, 0, 0),
        rotation=(0, 0, 0),
        scale=(1, 1, 1),
    )
    assert item.model_dump(mode="json")["projectId"] == "00000000-0000-0000-0000-000000000000"
