"""Offline profile verifier: Python standard library + OpenSSL, no application imports.

The operator supplies a separately trusted public registry and exact issuer.
This is a local interoperability test, not 1EdTech certification or online status.
"""
import argparse
import base64
import datetime as dt
import json
import pathlib
import re
import subprocess
import tempfile
import zlib


def check(condition, code):
    if not condition:
        raise ValueError(code)


def object_unique(pairs):
    result = {}
    for key, value in pairs:
        check(key not in result, "duplicate_json_key")
        result[key] = value
    return result


def parse_json(raw):
    check(len(raw) <= 200000, "input_size")
    return json.loads(raw, object_pairs_hook=object_unique,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError("json_number")))


def b64(raw):
    check(isinstance(raw, str) and re.fullmatch(r"[A-Za-z0-9_-]+", raw), "base64url")
    decoded = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
    check(base64.urlsafe_b64encode(decoded).decode().rstrip("=") == raw, "base64url_canonical")
    return decoded


def date(value):
    check(isinstance(value, str) and value.endswith("Z"), "date")
    result = dt.datetime.fromisoformat(value[:-1] + "+00:00").timestamp()
    check(result >= 0, "date")
    return result


def der(tag, data):
    size = len(data)
    length = bytes([size]) if size < 128 else size.to_bytes((size.bit_length() + 7) // 8, "big")
    if size >= 128:
        length = bytes([128 + len(length)]) + length
    return bytes([tag]) + length + data


def integer(data):
    check(data and data[0] != 0, "rsa_integer")
    return der(2, (b"\x00" if data[0] & 128 else b"") + data)


def pem(jwk):
    check(set(jwk) <= {"kty", "n", "e", "kid", "alg", "use"} and jwk["kty"] == "RSA", "public_key")
    n, e = b64(jwk["n"]), b64(jwk["e"])
    check(2048 <= int.from_bytes(n, "big").bit_length() <= 8192 and int.from_bytes(e, "big") == 65537, "rsa_strength")
    rsa = der(48, integer(n) + integer(e))
    spki = der(48, bytes.fromhex("300d06092a864886f70d0101010500") + der(3, b"\x00" + rsa))
    encoded = base64.b64encode(spki).decode()
    return "-----BEGIN PUBLIC KEY-----\n" + "\n".join(encoded[i:i+64] for i in range(0, len(encoded), 64)) + "\n-----END PUBLIC KEY-----\n"


def verify_jwt(token, trust, issuer, now):
    check(isinstance(token, str) and len(token) <= 48000 and token.count(".") == 2, "jwt_format")
    h, p, sig = token.split(".")
    header, payload = parse_json(b64(h)), parse_json(b64(p))
    check(set(header) == {"alg", "kid", "typ"} and header["alg"] == "RS256" and header["typ"] == "JWT", "jose_header")
    keys = [k for k in trust["keys"] if k["jwk"].get("kid") == header["kid"]]
    check(len(keys) == 1, "unknown_key")
    key = keys[0]
    check(key["state"] in ("active", "retired"), "key_untrusted")
    start = date(payload["validFrom"])
    check(type(payload.get("nbf")) is int and payload["nbf"] == start and start <= now, "not_before")
    check(start >= int(date(key["acceptedAt"])), "key_not_accepted")
    if key["state"] == "retired":
        check(key["retiredAt"] and start <= date(key["retiredAt"]), "key_retired")
    if "validUntil" in payload:
        end = date(payload["validUntil"])
        check(type(payload.get("exp")) is int and payload["exp"] == end and start < end and now < end, "expired")
    else:
        check("exp" not in payload, "expiry_binding")
    check(isinstance(payload.get("id"), str) and payload["id"] and isinstance(payload.get("credentialSubject"), dict) and isinstance(payload["credentialSubject"].get("id"), str) and payload["credentialSubject"]["id"], "vc_identity")
    actual_issuer = payload["issuer"] if isinstance(payload["issuer"], str) else payload["issuer"].get("id")
    check(payload.get("iss") == issuer == actual_issuer and payload.get("jti") == payload.get("id"), "issuer_id")
    check(payload.get("sub") == payload["credentialSubject"].get("id"), "subject_id")
    check(isinstance(payload.get("type"), list) and "VerifiableCredential" in payload["type"], "vc_type")
    check(isinstance(payload.get("@context"), list) and payload["@context"][0] == "https://www.w3.org/ns/credentials/v2", "vc_context")
    with tempfile.TemporaryDirectory(prefix="myys-independent-") as tmp:
        pub, signature = pathlib.Path(tmp) / "public.pem", pathlib.Path(tmp) / "signature.bin"
        pub.write_text(pem(key["jwk"]), encoding="ascii")
        signature.write_bytes(b64(sig))
        result = subprocess.run(["openssl", "dgst", "-sha256", "-verify", str(pub), "-signature", str(signature)],
                                input=(h + "." + p).encode("ascii"), capture_output=True, timeout=10, check=False)
        check(result.returncode == 0, "signature")
    return payload


def verify(bundle, trust, issuer, now):
    check(issuer == "https://local-acceptance.invalid/api/rozet/kurum", "local_issuer_only")
    check(trust.get("format") == "MYYS-LOCAL-TRUST-1" and trust.get("issuer") == issuer and trust.get("official") is False, "trust_profile")
    check(date(trust["generatedAt"]) <= now < date(trust["validUntil"]), "trust_expired")
    check(isinstance(trust.get("keys"), list) and 0 < len(trust["keys"]) <= 100, "trust_keys")
    check(bundle.get("format") == "MYYS-LOCAL-OB3-JWT-BUNDLE-1" and bundle.get("official") is False and bundle.get("scope") == "local-acceptance", "bundle_profile")
    credential = verify_jwt(bundle["credential"], trust, issuer, now)
    check("OpenBadgeCredential" in credential["type"] and "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json" in credential["@context"], "ob_profile")
    check(isinstance(credential.get("id"), str) and re.fullmatch(re.escape(issuer.replace('/kurum', '/kayit/')) + r"[a-f0-9-]{36}", credential["id"]), "credential_id")
    fields = "learner title issuer date outcomes workload level assessment participation criteria quality".split()
    metadata = credential.get("pilotMetadata", {})
    check(metadata.get("pilot") is True and all(isinstance(metadata.get(k), str) and metadata[k].strip() for k in fields), "profile_fields")
    check(credential.get("academicDecision", {}).get("scope") == "local-acceptance" and credential["academicDecision"].get("profileId") and credential["academicDecision"].get("statusProfile") == "MYYS-LOCAL-STATUS-1", "academic_profile")
    subject = credential["credentialSubject"]
    achievement = subject.get("achievement", {})
    check(subject["id"].startswith("urn:unigo:local-acceptance:") and "AchievementSubject" in subject.get("type", []) and "Achievement" in achievement.get("type", []), "achievement_type")
    check(all(isinstance(achievement.get(k), str) and achievement[k].strip() for k in ("id", "name", "description")) and isinstance(achievement.get("criteria", {}).get("narrative"), str) and achievement["criteria"]["narrative"].strip(), "achievement_fields")
    check(metadata["date"] == credential["validFrom"], "profile_date")
    entries, lists = credential.get("credentialStatus"), bundle.get("statusLists")
    check(isinstance(entries, list) and len(entries) == 2 and isinstance(lists, list) and len(lists) == 2, "status_required")
    check({x.get("statusPurpose") for x in entries} == {"revocation", "suspension"}, "status_purpose")
    check(len({x.get("id") for x in lists}) == 2, "status_duplicate")
    for entry in entries:
        index = entry.get("statusListIndex")
        check(entry.get("type") == "BitstringStatusListEntry" and isinstance(index, str) and re.fullmatch(r"0|[1-9][0-9]{0,5}", index), "status_index")
        index = int(index)
        check(index < 131072, "status_index")
        url = entry.get("statusListCredential")
        check(isinstance(url, str) and re.fullmatch(r"https://local-acceptance\.invalid/myys/status/[a-f0-9]{64}/" + entry["statusPurpose"], url) and entry.get("id") == url + "#" + str(index), "status_url")
        found = [x for x in lists if x.get("id") == url]
        check(len(found) == 1, "status_missing")
        status = verify_jwt(found[0]["jwt"], trust, issuer, now)
        subject = status["credentialSubject"]
        check(status["id"] == url and "BitstringStatusListCredential" in status["type"] and subject.get("id") == url + "#list" and subject.get("type") == "BitstringStatusList" and subject.get("statusPurpose") == entry["statusPurpose"], "status_binding")
        check("validUntil" in status and 0 < date(status["validUntil"]) - date(status["validFrom"]) <= 300 and subject.get("ttl") == 60000, "status_freshness")
        encoded = subject.get("encodedList")
        check(isinstance(encoded, str) and encoded.startswith("u") and len(encoded) < 48000, "status_encoding")
        decoder = zlib.decompressobj(16 + zlib.MAX_WBITS)
        bits = decoder.decompress(b64(encoded[1:]), 16385)
        check(len(bits) == 16384 and decoder.eof and not decoder.unconsumed_tail and not decoder.unused_data, "status_size")
        check(not (bits[index // 8] & (1 << (7 - index % 8))), "revoked" if entry["statusPurpose"] == "revocation" else "suspended")
    return {"valid": True, "profile": bundle["format"], "official": False, "certification": False,
            "engine": "Python stdlib + OpenSSL", "onlineStatus": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--trust", required=True, help="Separately trusted operator public registry; never trust keys from the bundle")
    parser.add_argument("--issuer", required=True)
    parser.add_argument("--at", help="Synthetic test time only; omitted uses current UTC")
    args = parser.parse_args()
    try:
        def read(path):
            with open(path, "rb") as file:
                return parse_json(file.read(200001))
        at = date(args.at) if args.at else dt.datetime.now(dt.timezone.utc).timestamp()
        print(json.dumps(verify(read(args.bundle), read(args.trust), args.issuer, at), ensure_ascii=False))
    except (ValueError, KeyError, TypeError, AttributeError, RecursionError, OSError, subprocess.SubprocessError, zlib.error, OverflowError) as exc:
        code = str(exc) if isinstance(exc, ValueError) and re.fullmatch(r"[a-z_]+", str(exc)) else "invalid_bundle"
        print(json.dumps({"valid": False, "code": code, "official": False, "certification": False}))
        raise SystemExit(1)
