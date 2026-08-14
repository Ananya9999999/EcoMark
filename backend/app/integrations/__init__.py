import os

if os.getenv("USE_MOCKS", "true").lower() == "true":
    from . import mock_verification as verification
    from . import mock_chain as chain
else:
    from . import verification
    from . import chain
