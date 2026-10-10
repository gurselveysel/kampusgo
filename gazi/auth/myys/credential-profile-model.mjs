import {FIELDS,SOURCE,ISSUER_NAME} from '../lib/badge-model.mjs';
export const profileSource=Object.freeze({url:SOURCE,version:'2026.10.10.3',scope:'public-source-summary',officialApproval:false});
export const profileIssuer=ISSUER_NAME;
export const profileFields=Object.freeze(FIELDS.map(([key,label])=>Object.freeze({key,label})));
export const profileFormat='OB-3.0-VC-2.0-RS256-local-1';
