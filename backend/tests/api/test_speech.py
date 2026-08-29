"""
HTTP tests for the optional voice-narration endpoints. Uses the _FakeSpeechProvider from
conftest.py -- no ElevenLabs network call.
"""

from __future__ import annotations

import pytest

from tests.api.conftest import _DisabledSpeechProvider, _FakeSpeechProvider
from app.api.dependencies import get_narrate_text_use_case
from app.application.use_cases.narrate_text import NarrateTextUseCase
from app.main import app


def test_status_reports_enabled_when_a_provider_is_configured(client):
    body = client.get("/api/v1/speech/status").json()
    assert body == {"enabled": True, "provider": "elevenlabs", "voice_id": "test-voice"}


def test_narrate_returns_audio_bytes_and_headers(client, speech_provider):
    resp = client.post("/api/v1/speech/narrate", json={"text": "Two wheeler is the recommended mode."})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/mpeg"
    assert resp.headers["x-speech-provider"] == "elevenlabs"
    assert resp.headers["x-speech-characters"] == str(len("Two wheeler is the recommended mode."))
    assert resp.content.startswith(b"ID3")
    assert speech_provider.calls == ["Two wheeler is the recommended mode."]


def test_narrate_rejects_empty_text_with_422(client):
    assert client.post("/api/v1/speech/narrate", json={"text": ""}).status_code == 422


def test_narrate_rejects_whitespace_only_text_with_400(client, speech_provider):
    resp = client.post("/api/v1/speech/narrate", json={"text": "   \n  "})
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "ValidationError"
    assert speech_provider.calls == []  # never reached the provider


def test_narrate_rejects_overlong_text_with_422(client):
    assert client.post("/api/v1/speech/narrate", json={"text": "a" * 1501}).status_code == 422


def test_repeated_identical_text_hits_the_cache_not_the_provider(client, speech_provider):
    payload = {"text": "Cache this exact sentence."}
    assert client.post("/api/v1/speech/narrate", json=payload).status_code == 200
    assert client.post("/api/v1/speech/narrate", json=payload).status_code == 200
    assert speech_provider.calls == ["Cache this exact sentence."]  # provider called once


@pytest.fixture
def disabled_speech_client(client):
    app.dependency_overrides[get_narrate_text_use_case] = lambda: NarrateTextUseCase(_DisabledSpeechProvider())
    yield client


def test_status_reports_disabled_when_no_provider_is_configured(disabled_speech_client):
    body = disabled_speech_client.get("/api/v1/speech/status").json()
    assert body == {"enabled": False, "provider": None, "voice_id": None}


def test_narrate_returns_503_when_speech_is_not_configured(disabled_speech_client):
    resp = disabled_speech_client.post("/api/v1/speech/narrate", json={"text": "anything"})
    assert resp.status_code == 503
    assert resp.json()["error_code"] == "SpeechUnavailableError"
