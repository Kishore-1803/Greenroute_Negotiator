"""domain/preference/interfaces.py -- preference persistence port."""

from __future__ import annotations

from typing import Protocol

from app.domain.preference.entities import UserPreference


class PreferenceStore(Protocol):
    def get_or_create(self, user_id: str, stated_priority: str | None) -> UserPreference:
        """Returns the learned weight vector for an existing user, or seeds a new row from
        COLD_START_PRESETS[stated_priority] (falling back to the 'balanced' preset when no
        priority was stated) the first time a user_id is seen."""
        ...

    def update(
        self,
        user_id: str,
        selected: dict[str, float],
        recommended: dict[str, float],
        learning_rate: float = 0.05,
    ) -> UserPreference:
        """Online weight-update rule (Master Plan Section 5): w_new = max(floor, w_old + eta *
        (v_selected - v_recommended)), renormalized so the vector sums to 1. Increments
        trip_count. Called only when the user's selected mode differs from the recommended
        mode -- agreement carries no learning signal."""
        ...
