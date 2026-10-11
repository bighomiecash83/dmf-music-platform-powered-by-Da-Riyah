"""Tests for royalty calculation logic."""
import pytest
from decimal import Decimal
from app.workers.royalty_worker import calculate_gross_royalty, apply_splits


def test_calculate_gross_royalty_spotify():
    gross = calculate_gross_royalty(1000, "spotify")
    assert gross == Decimal("4.0000")


def test_calculate_gross_royalty_apple():
    gross = calculate_gross_royalty(1000, "apple_music")
    assert gross == Decimal("8.0000")


def test_calculate_gross_royalty_unknown_dsp_uses_default():
    gross = calculate_gross_royalty(1000, "unknown_dsp")
    assert gross == Decimal("4.0000")


def test_calculate_gross_royalty_zero_streams():
    assert calculate_gross_royalty(0, "spotify") == Decimal("0")


def test_apply_splits_sum():
    gross = Decimal("100.0000")
    splits = [
        {"participant_id": "a1", "role": "artist", "percentage": 70.0},
        {"participant_id": "l1", "role": "label", "percentage": 30.0},
    ]
    settlements = apply_splits(gross, splits)
    total_net = sum(Decimal(str(s["net_amount"])) for s in settlements)
    expected_net = gross * (1 - Decimal("0.15"))
    assert abs(total_net - expected_net) < Decimal("0.01")


def test_apply_splits_roles():
    splits = [
        {"participant_id": "a1", "role": "artist", "percentage": 100.0},
    ]
    settlements = apply_splits(Decimal("50.0000"), splits)
    assert settlements[0]["role"] == "artist"
    assert settlements[0]["participant_id"] == "a1"


def test_apply_splits_empty():
    assert apply_splits(Decimal("100"), []) == []
