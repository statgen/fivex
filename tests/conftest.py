"""Shared fixtures"""

import pytest  # type: ignore  # noqa

from pheget import create_app


@pytest.fixture
def app():
    app = create_app("pheget.settings.test")
    return app
