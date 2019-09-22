from baserow.contrib.database.models import Database


class ApplicationFixtures:
    def create_database_application(self, **kwargs):
        if 'group' not in kwargs:
            kwargs['group'] = self.create_group()

        if 'name' not in kwargs:
            kwargs['name'] = self.fake.name()

        if 'order' not in kwargs:
            kwargs['order'] = 0

        return Database.objects.create(**kwargs)
