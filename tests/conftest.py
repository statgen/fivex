"""Shared fixtures"""

import pytest  # type: ignore  # noqa

from fivex import create_app


@pytest.fixture
def app():
    app = create_app("fivex.settings.test")
    return app
