from datetime import datetime

import pytest
import pytz
from freezegun import freeze_time

from baserow.contrib.database.rows.actions import UpdateRowsActionType
from baserow.contrib.database.rows.handler import RowHandler
from baserow.contrib.database.rows.models import RowHistory
from baserow.core.action.registries import action_type_registry


@pytest.mark.django_db
@pytest.mark.row_history
def test_update_rows_insert_multiple_entries_in_row_history(data_fixture):
    user = data_fixture.create_user()
    database = data_fixture.create_database_application(user=user)
    table = data_fixture.create_database_table(
        name="Test", user=user, database=database
    )
    name_field = data_fixture.create_text_field(
        table=table, name="Name", text_default="Test"
    )

    row_handler = RowHandler()

    row_one = row_handler.create_row(user, table, {name_field.id: "Original 1"})
    row_two = row_handler.create_row(user, table, {name_field.id: "Original 2"})

    with freeze_time("2021-01-01 12:00"):
        action_type_registry.get_by_type(UpdateRowsActionType).do(
            user,
            table,
            [
                {"id": row_one.id, f"field_{name_field.id}": "New 1"},
                {"id": row_two.id, f"field_{name_field.id}": "New 2"},
            ],
        )
    assert RowHistory.objects.count() == 2

    history_entries = RowHistory.objects.order_by("row_id").values(
        "user_id",
        "user_name",
        "table_id",
        "row_id",
        "action_timestamp",
        "action_type",
        "before_values",
        "after_values",
        "fields_metadata",
    )

    assert list(history_entries) == [
        {
            "user_id": user.id,
            "user_name": user.first_name,
            "table_id": table.id,
            "row_id": row_one.id,
            "action_timestamp": datetime(2021, 1, 1, 12, 0, tzinfo=pytz.UTC),
            "action_type": "update_rows",
            "before_values": {f"field_{name_field.id}": "Original 1"},
            "after_values": {f"field_{name_field.id}": "New 1"},
            "fields_metadata": {
                f"field_{name_field.id}": {
                    "type": "text",
                    "id": name_field.id,
                }
            },
        },
        {
            "user_id": user.id,
            "user_name": user.first_name,
            "table_id": table.id,
            "row_id": row_two.id,
            "action_timestamp": datetime(2021, 1, 1, 12, 0, tzinfo=pytz.UTC),
            "action_type": "update_rows",
            "before_values": {f"field_{name_field.id}": "Original 2"},
            "after_values": {f"field_{name_field.id}": "New 2"},
            "fields_metadata": {
                f"field_{name_field.id}": {
                    "type": "text",
                    "id": name_field.id,
                }
            },
        },
    ]


@pytest.mark.django_db
@pytest.mark.row_history
def test_history_handler_only_save_changed_fields(data_fixture):
    user = data_fixture.create_user()
    database = data_fixture.create_database_application(user=user)
    table = data_fixture.create_database_table(
        name="Test", user=user, database=database
    )
    name_field = data_fixture.create_text_field(
        table=table, name="Name", text_default="Test"
    )
    number_field = data_fixture.create_number_field(
        table=table, name="Number", number_decimal_places=2
    )

    row_handler = RowHandler()

    row = row_handler.create_row(user, table, {name_field.id: "Original 1"})

    with freeze_time("2021-01-01 12:00"):
        action_type_registry.get_by_type(UpdateRowsActionType).do(
            user,
            table,
            [
                {
                    "id": row.id,
                    f"field_{name_field.id}": "New 1",
                    f"field_{number_field.id}": None,
                }
            ],
        )

    assert RowHistory.objects.count() == 1

    history_entries = RowHistory.objects.values(
        "user_id",
        "user_name",
        "table_id",
        "row_id",
        "action_timestamp",
        "action_type",
        "before_values",
        "after_values",
        "fields_metadata",
    )

    assert list(history_entries) == [
        {
            "user_id": user.id,
            "user_name": user.first_name,
            "table_id": table.id,
            "row_id": row.id,
            "action_timestamp": datetime(2021, 1, 1, 12, 0, tzinfo=pytz.UTC),
            "action_type": "update_rows",
            "before_values": {
                f"field_{name_field.id}": "Original 1",
            },
            "after_values": {f"field_{name_field.id}": "New 1"},
            "fields_metadata": {
                f"field_{name_field.id}": {
                    "type": "text",
                    "id": name_field.id,
                }
            },
        },
    ]


@pytest.mark.django_db
@pytest.mark.row_history
def test_update_rows_action_doesnt_insert_entries_if_row_doesnt_change(data_fixture):
    user = data_fixture.create_user()
    database = data_fixture.create_database_application(user=user)
    table = data_fixture.create_database_table(
        name="Test", user=user, database=database
    )
    name_field = data_fixture.create_text_field(
        table=table, name="Name", text_default="Test"
    )

    row_handler = RowHandler()

    row_one = row_handler.create_row(user, table, {name_field.id: "Original 1"})
    row_two = row_handler.create_row(user, table, {name_field.id: "Original 2"})

    with freeze_time("2021-01-01 12:00"):
        action_type_registry.get_by_type(UpdateRowsActionType).do(
            user,
            table,
            [
                {"id": row_one.id, f"field_{name_field.id}": "New 1"},
                {"id": row_two.id, f"field_{name_field.id}": "Original 2"},
            ],
        )

    # This does not insert any entries in the row history table because no values
    # have changed.
    with freeze_time("2021-01-01 12:00"):
        action_type_registry.get_by_type(UpdateRowsActionType).do(
            user,
            table,
            [{"id": row_one.id, f"field_{name_field.id}": "New 1"}],
        )

    assert RowHistory.objects.count() == 1
    history_entries = RowHistory.objects.order_by("row_id").values(
        "user_id",
        "user_name",
        "table_id",
        "row_id",
        "action_timestamp",
        "action_type",
        "before_values",
        "after_values",
        "fields_metadata",
    )
    assert list(history_entries) == [
        {
            "user_id": user.id,
            "user_name": user.first_name,
            "table_id": table.id,
            "row_id": row_one.id,
            "action_timestamp": datetime(2021, 1, 1, 12, 0, tzinfo=pytz.UTC),
            "action_type": "update_rows",
            "before_values": {f"field_{name_field.id}": "Original 1"},
            "after_values": {f"field_{name_field.id}": "New 1"},
            "fields_metadata": {
                f"field_{name_field.id}": {
                    "type": "text",
                    "id": name_field.id,
                }
            },
        }
    ]
