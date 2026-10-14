"""Independent historical source verifier: Python stdlib + OpenSSL, no app imports.
An independently trusted public source file is mandatory. The local decision envelope
is unsigned; reproducing its content does not authenticate the commission decision.
"""
import argparse
import base64
import datetime as dt
import json
import pathlib
import re
import subprocess
import tempfile
import hashlib
import math


class VerificationError(ValueError):
    pass

def check(condition, code):
    if not condition:
        raise VerificationError(code)


def object_unique(pairs):
    result = {}
    for key, value in pairs:
        check(key not in result, "duplicate_json_key")
        result[key] = value
    return result


def parse_json(raw):
    check(len(raw) <= 20000000, "input_size")
    return json.loads(raw, object_pairs_hook=object_unique,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError("json_number")))


def b64(raw):
    check(isinstance(raw, str) and re.fullmatch(r"[A-Za-z0-9_-]+", raw), "base64url")
    decoded = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
    check(base64.urlsafe_b64encode(decoded).decode().rstrip("=") == raw, "base64url_canonical")
    return decoded


def date(value):
    check(isinstance(value, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z", value), "date")
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


def canonical(value):
    # MYYS local bounded JSON profile, not a claim of general RFC 8785 support.
    if isinstance(value, dict):
        return {k: canonical(v) for k, v in value.items()}
    if isinstance(value, list):
        return [canonical(v) for v in value]
    if isinstance(value, float):
        check(math.isfinite(value) and (value == 0 or 0.000001 <= abs(value) < 1e21), 'number_profile')
        return int(value) if value.is_integer() else value
    return value


def encoded(value):
    return json.dumps(canonical(value), ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')


def digest(value):
    return hashlib.sha256(value if isinstance(value, bytes) else encoded(value)).hexdigest()


def source_jwt(token, trust):
    check(isinstance(token, str) and len(token) <= 50000 and token.count('.') == 2, 'jwt_format')
    h, p, sig = token.split('.')
    header, payload = parse_json(b64(h)), parse_json(b64(p))
    check(set(header) == {'alg', 'kid', 'typ'} and header['alg'] == 'RS256' and header['typ'] == 'myys-source+jwt', 'jose_header')
    check(set(payload) == {'iss', 'aud', 'iat', 'exp', 'jti', 'sub', 'personId', 'format', 'scope', 'binding', 'event'}, 'source_claims')
    check(payload['iss'] == trust['issuer'] and payload['aud'] == trust['audience'] and payload['format'] == 'myys-source-packet/1', 'source_scope')
    check(type(payload['iat']) is int and type(payload['exp']) is int and 0 < payload['exp']-payload['iat'] <= 86400, 'source_time')
    keys = [k for k in trust['keys'] if k['jwk']['kid'] == header['kid']]
    check(len(keys) == 1, 'source_key')
    key = keys[0]
    check(key['state'] in ['active', 'retired'] and key['jwk']['alg'] == 'RS256' and key['jwk']['use'] == 'sig', 'source_key_state')
    check(date(key['notBefore']) <= payload['iat'] < date(key['notAfter']), 'source_key_time')
    if key['state'] == 'retired':
        check(payload['iat'] < date(key['retiredAt']), 'source_key_retired')
    with tempfile.TemporaryDirectory(prefix='myys-source-independent-') as tmp:
        public, signature = pathlib.Path(tmp)/'public.pem', pathlib.Path(tmp)/'signature.bin'
        public.write_text(pem(key['jwk']), encoding='ascii')
        signature.write_bytes(b64(sig))
        result = subprocess.run(['openssl', 'dgst', '-sha256', '-verify', str(public), '-signature', str(signature)], input=(h+'.'+p).encode('ascii'), capture_output=True, timeout=10, check=False)
        check(result.returncode == 0, 'source_signature')
    expected = {k: trust[k] for k in ['tenant', 'unit', 'contractId', 'contractVersion', 'courseId', 'sourceProgramVersion', 'sourceRubricVersion']}
    check(payload['scope'] == expected, 'source_contract')
    event = payload['event']
    check(set(event) == {'id', 'revision', 'type', 'occurredAt', 'taskId', 'submissionId', 'submissionVersion', 'content', 'contentSha256', 'grade', 'completed'}, 'source_event_fields')
    check(event['type'] == 'grade' and event['completed'] is None and type(event['revision']) is int and event['revision'] >= 1 and event['submissionVersion'] == event['revision'], 'source_event')
    check(event['id'] == payload['jti'] and re.fullmatch(r'[A-Za-z0-9_-]{8,100}', event['id']) and isinstance(event['submissionId'], str) and 0 < len(event['submissionId']) <= 255, 'source_identity')
    check(isinstance(event['content'], str) and 20 <= len(event['content']) <= 20000 and digest(event['content'].encode()) == event['contentSha256'], 'source_content')
    check(type(event['grade']) in (int, float) and 0 <= event['grade'] <= 100, 'source_grade')
    check(date(event['occurredAt']) <= payload['iat']+0.999, 'source_occurred')
    check(all(isinstance(payload[k], str) and 0 < len(payload[k]) <= 255 for k in ['sub', 'personId']), 'source_subject')
    return payload, header


def verify(archive, trust):
    now = dt.datetime.now(dt.timezone.utc).timestamp()
    check(trust.get('format') == 'myys-source-trust/1' and trust.get('scope') == 'local-acceptance' and trust.get('official') is False, 'trust_profile')
    check(isinstance(trust.get('issuer'), str) and re.fullmatch(r'https://[A-Za-z0-9.-]+\.invalid', trust['issuer']), 'local_source_only')
    check(date(trust['exportedAt']) <= now < date(trust['expiresAt']) and date(trust['expiresAt'])-date(trust['exportedAt']) <= 300, 'trust_freshness')
    check(isinstance(trust.get('keys'), list) and 0 < len(trust['keys']) <= 8 and len({k['jwk']['kid'] for k in trust['keys']}) == len(trust['keys']), 'trust_keys')
    check(archive.get('signed') is False and archive.get('official') is False and archive.get('scope') == 'local-acceptance', 'archive_profile')
    body = archive['payload']
    check(body['format'] == 'myys-decision-archive/1' and body['tenant'] == trust['tenant'] and digest(body) == archive['sha256'], 'archive_digest')
    program, assessment, decision = body['program'], body['assessment'], body['decision']
    check(program['id'] == trust['programId'] == assessment['programId'] == decision['programId'] and program['unit'] == trust['unit'], 'program_id')
    check(body['programDigest'] == assessment['programDigest'] == digest(program) and assessment['programSnapshot'] == program and assessment['rubricSnapshot'] == program['rubric'], 'program_snapshot')
    check(decision['assessmentId'] == assessment['id'] and decision['owner'] == assessment['owner'] and decision['enrollmentId'] == assessment['enrollmentId'] and decision['evidenceDigests'] == assessment['evidenceDigests'], 'decision_binding')
    evidence = {e['id']: e for e in body['evidence']}
    refs = assessment['evidenceDigests']
    check(len(evidence) == len(body['evidence']) == len(refs) == len(assessment['evidenceIds']) and set(evidence) == set(assessment['evidenceIds']) == {r['id'] for r in refs}, 'evidence_ids')
    check({t['id'] for t in program['tasks']} <= {e['taskId'] for e in evidence.values()}, 'required_tasks')
    count = 0
    for ref in refs:
        ev = evidence[ref['id']]
        check(ev['enrollmentId'] == assessment['enrollmentId'] and ev['owner'] == assessment['owner'] and ev['unit'] == program['unit'] and ev['programId'] == program['id'], 'evidence_scope')
        check(digest(ev['content'].encode()) == ev['sha256'] == ref['sha256'], 'evidence_hash')
        if 'source' not in ref:
            check('sourceProofDigest' not in ev, 'source_missing')
            continue
        source = ref['source']
        proof = source['proof']
        jwt, header = source_jwt(proof['jwt'], trust)
        token_hash = digest(proof['jwt'].encode('ascii'))
        check(token_hash == proof['sha256'] == source['digest'] == ev['sourceDigest'] and digest(proof) == ev['sourceProofDigest'], 'source_pin')
        check(source['eventId'] == ev['sourceEventId'] == digest((trust['contractId']+'\0'+jwt['event']['id']).encode()), 'source_event_id')
        check(jwt['personId'] == ev['owner'] and jwt['event']['content'] == ev['content'] and jwt['event']['taskId'] == ev['taskId'], 'source_person_work')
        task = next(t for t in program['tasks'] if t['id'] == ev['taskId'])
        binding = {'programId':program['id'], 'programVersion':program['version'], 'programSha256':digest(program), 'rubricSha256':digest(program['rubric']), 'taskId':task['id'], 'taskSha256':digest(task)}
        check(jwt['binding'] == proof['binding'] == binding, 'source_version_binding')
        check(source['revision'] == jwt['event']['revision'] == ev['sourceSubmissionVersion'] == proof['submissionVersion'] and proof['submissionId'] == ev['sourceSubmissionId'] == jwt['event']['submissionId'], 'source_submission')
        check(source['occurredAt'] == jwt['event']['occurredAt'] and jwt['iat'] <= date(proof['receivedAt']) <= date(source['receivedAt']) < jwt['exp'], 'source_receipt_time')
        check(proof['issuer'] == jwt['iss'] and proof['kid'] == header['kid'] and proof['contractVersion'] == trust['contractVersion'] and proof['sourceProgramVersion'] == trust['sourceProgramVersion'] and proof['sourceRubricVersion'] == trust['sourceRubricVersion'] and proof['official'] is False, 'source_proof_metadata')
        count += 1
    check(count > 0 and archive['sourceSignatures'] == count, 'source_count')
    scores = {v['criterionId']:v for v in assessment['scores']}
    check(len(scores) == len(assessment['scores']) == len(program['rubric']) and set(scores) == {r['id'] for r in program['rubric']} and sum(r['weight'] for r in program['rubric']) == 100, 'rubric_coverage')
    score = 0
    for r in program['rubric']:
        v = scores[r['id']]
        check(type(v['score']) is int and 0 <= v['score'] <= 4, 'human_score')
        score += r['weight']*v['score']/4
    check(score == assessment['score'] == decision['score'] and assessment['passed'] is (score >= program['threshold']), 'reproduced_score')
    check(decision['outcome'] in ['approved', 'rejected'] and (decision['outcome'] != 'approved' or assessment['passed']), 'decision_outcome')
    return {'validSourceSignatures':True, 'sourceSignatures':count, 'unsignedEvidence':len(evidence)-count, 'historicalContentReproduced':True, 'score':score, 'archiveSha256':archive['sha256'], 'academicDecisionSignature':False, 'currentEligibilityVerified':False, 'official':False, 'scope':'local-acceptance'}


def main():
    parser = argparse.ArgumentParser(description='Yerel kaynak imzalarını ayrı güven dosyasıyla doğrular; akademik karar zarfı imzasızdır.')
    parser.add_argument('archive')
    parser.add_argument('--trust', required=True)
    args = parser.parse_args()
    try:
        result = verify(parse_json(pathlib.Path(args.archive).read_bytes()), parse_json(pathlib.Path(args.trust).read_bytes()))
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'validSourceSignatures':False, 'code':str(e) if isinstance(e, VerificationError) else 'invalid_archive', 'official':False}))
        raise SystemExit(1)


if __name__ == '__main__':
    main()
