import pytest
from django.shortcuts import reverse
from rest_framework.status import (
    HTTP_400_BAD_REQUEST,
)

from baserow.contrib.database.fields.models import SelectOption


@pytest.mark.django_db
@pytest.mark.field_single_select
@pytest.mark.api_rows
def test_batch_update_rows_single_select_field_wrong_option(api_client, data_fixture):
    user, jwt_token = data_fixture.create_user_and_token()
    table = data_fixture.create_database_table(user=user)
    single_select_field = data_fixture.create_single_select_field(table=table)
    select_option_1 = SelectOption.objects.create(
        field=single_select_field,
        order=1,
        value="Option 1",
        color="blue",
    )
    single_select_field.select_options.set([select_option_1])
    model = table.get_model()
    row_1 = model.objects.create()
    row_2 = model.objects.create()
    url = reverse("api:database:rows:batch", kwargs={"table_id": table.id})
    request_body = {
        "items": [
            {
                f"id": row_1.id,
                f"field_{single_select_field.id}": 787,
            },
            {
                f"id": row_2.id,
                f"field_{single_select_field.id}": select_option_1.id,
            },
        ]
    }

    response = api_client.patch(
        url,
        request_body,
        format="json",
        HTTP_AUTHORIZATION=f"JWT {jwt_token}",
    )
    assert response.status_code == HTTP_400_BAD_REQUEST
    assert response.json()["error"] == "ERROR_INVALID_SELECT_OPTION_VALUES"
    assert (
        response.json()["detail"]
        == "The provided select option ids [787] are not valid select options."
    )
