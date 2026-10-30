"""Integration loaders.

Set either the master switch or the fine-grained ones:

  USE_MOCKS=true|false          # if set, forces both (legacy)
  USE_MOCK_VERIFICATION=true|false
  USE_MOCK_CHAIN=true|false

Defaults: both mock (safe for first run).
For real satellite/OCR + real ledger:

  USE_MOCKS=false
  EE_PROJECT=...
  LOCAL_RPC=...
  PRIVATE_KEY=...
  CONTRACT_ADDRESS=...
"""

from __future__ import annotations

import os


def _flag(name: str, default: str = "true") -> bool:
    return os.getenv(name, default).lower() == "true"


def _use_mock_verification() -> bool:
    master = os.getenv("USE_MOCKS")
    if master is not None:
        return master.lower() == "true"
    return _flag("USE_MOCK_VERIFICATION", "true")


def _use_mock_chain() -> bool:
    master = os.getenv("USE_MOCKS")
    if master is not None:
        return master.lower() == "true"
    return _flag("USE_MOCK_CHAIN", "true")


if _use_mock_verification():
    from . import mock_verification as verification
else:
    from . import verification

if _use_mock_chain():
    from . import mock_chain as chain
else:
    from . import chain
