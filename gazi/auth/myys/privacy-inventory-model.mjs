// Local data inventory and positive export schema. This is not a legal retention policy.
export const inventoryVersion='2026.10.14.46';
export const privacyCategories={
  "learning": {
    "label": "Öğrenme ve değerlendirme",
    "purpose": "Başvuru, çalışma, insan değerlendirmesi, itiraz ve kaynak ilerlemesini birlikte izlemek.",
    "retention": "Akademik dayanak ve süre kurumca belirlenmeli; bu ekrandan akademik kayıt silinmez."
  },
  "credentials": {
    "label": "Belge, tanıma ve aktarım",
    "purpose": "Belge geçmişi, tanıma kararı, kredi ve yerel aktarım sonuçlarını izlemek.",
    "retention": "İmzalı belge ayrı cüzdandan alınır. Kurum saklama kararı ve dış sistem kabulü gerekir."
  },
  "sharing": {
    "label": "Paylaşım ve portfolyo",
    "purpose": "Sizin seçtiğiniz paylaşım izinlerini ve amaçlı erişim geçmişini izlemek.",
    "retention": "Geri çekme yeni erişimi kapatır; önceki kopyaların silindiğini kanıtlamaz."
  },
  "support": {
    "label": "Destek yazışmaları",
    "purpose": "Talep, yanıt, çözüm, kapanış ve yeniden açılma geçmişini izlemek.",
    "retention": "Destek saklama süresi kurumca belirlenmeli; yazışmalar otomatik silinmez."
  },
  "financial": {
    "label": "Mali prova hareketleri",
    "purpose": "Yerel sipariş, olay, iade ve mutabakat provasını izlemek.",
    "retention": "Gerçek ödeme veya banka hareketi değildir; mali saklama usulü ayrıca gerekir."
  },
  "rights": {
    "label": "Veri talebi geçmişi",
    "purpose": "Kendi talebiniz, gerekçeli yanıt, okuma, indirme ve temizlik kayıtlarını izlemek.",
    "retention": "Yerel işlem resmî başvuru veya tebligat değildir; dayanak ve süre ayrıca belirlenmeli."
  },
  "account": {
    "label": "Hesap ve üyelik",
    "purpose": "Bu kurumdaki etkin üyelikleriniz ve görev değişikliklerinizi izlemek.",
    "retention": "Yalnız süresi dolmuş, bu kuruma bağlı oturumlar mevcut ayrı inceleme yoluyla temizlenebilir."
  },
  "governance": {
    "label": "Kurumsal işlem katkıları",
    "purpose": "Görevli olarak oluşturduğunuz kayıtların sayısını göstermek.",
    "retention": "Kişisel özet başka kişilerin veya toplu işlemlerin içeriğini açmaz; ayrı inceleme gerekir."
  }
};
export const recordGroups={
  "learning": [
    "material-delivery",
    "application",
    "application-review",
    "enrollment",
    "evidence",
    "evidence-moderation",
    "assessment",
    "decision",
    "decision-receipt",
    "appeal",
    "resolution",
    "lms-event",
    "lms-receipt",
    "lms-job",
    "lms-review",
    "advice-sample",
    "advice-compare",
    "advice-contest",
    "advice-resolve",
    "skill-map-issue"
  ],
  "credentials": [
    "issuance",
    "signed",
    "revocation",
    "credential-receipt",
    "replacement-proposal",
    "replacement-review",
    "replacement-withdraw",
    "replacement-completion",
    "recognition-offer",
    "recognition-offer-decision",
    "recognition-offer-appeal",
    "recognition-offer-resolution",
    "recognition-offer-withdrawal",
    "recognition-request",
    "recognition-technical",
    "recognition-decision",
    "recognition-credit",
    "recognition-reversal",
    "recognition-appeal",
    "recognition-resolution",
    "obs-event",
    "obs-receipt",
    "obs-reconciliation",
    "status-allocation",
    "status-snapshot"
  ],
  "sharing": [
    "share",
    "share-revocation",
    "portfolio-grant",
    "portfolio-revocation",
    "portfolio-access",
    "portfolio-feedback"
  ],
  "support": [
    "support",
    "support-event"
  ],
  "financial": [
    "payment-order",
    "payment-event",
    "payment-refund",
    "payment-receipt",
    "payment-reconciliation"
  ],
  "rights": [
    "privacy-login-preview",
    "privacy-login-cleanup",
    "privacy-request",
    "privacy-response",
    "privacy-read",
    "privacy-cleanup",
    "privacy-withdrawal",
    "privacy-export"
  ],
  "account": [
    "membership-proposal",
    "membership-review"
  ],
  "governance": [
    "advice-protocol",
    "advice-protocol-hold",
    "advice-protocol-review",
    "appeal-policy",
    "appeal-policy-hold",
    "appeal-policy-review",
    "batch",
    "batch-result",
    "cohort",
    "cohort-evaluation",
    "cohort-event",
    "cohort-gate",
    "cohort-issue",
    "cohort-issue-review",
    "cohort-review",
    "credential-profile",
    "credential-profile-hold",
    "credential-profile-review",
    "flow-policy",
    "flow-review",
    "key",
    "key-review",
    "key-state",
    "payment-plan",
    "payment-plan-hold",
    "payment-plan-review",
    "portfolio-policy",
    "portfolio-policy-hold",
    "portfolio-policy-review",
    "program",
    "publication",
    "recognition-policy",
    "recognition-policy-review",
    "recovery-attempt",
    "recovery-plan",
    "recovery-result",
    "recovery-review",
    "authority-attachment",
    "authority-file",
    "authority-dossier",
    "authority-review",
    "authority-hold",
    "authority-download",
    "material-plan",
    "material-rights",
    "material-review",
    "material-hold",
    "registry",
    "registry-review",
    "retention-preview",
    "retention-run",
    "sem-dossier",
    "sem-package",
    "sem-review",
    "sem-withdrawal",
    "skill-map",
    "skill-map-hold",
    "skill-map-review",
    "source-contract",
    "source-contract-review",
    "source-trust-state",
    "support-policy",
    "support-policy-hold",
    "support-policy-review",
    "unit-capacity",
    "unit-capacity-hold",
    "unit-capacity-review",
    "wallet-study",
    "wallet-study-hold",
    "wallet-study-review"
  ]
};
export const subjectFields={
 "recognition-offer":['id','unit','enrollmentId','policyId','targetProgramCode','title','reason','rows','createdAt','official'],
 "recognition-offer-decision":['id','unit','offerId','rowDecisionIds','credits','remoteCredits','reason','authorityReference','resolutionId','supersedesDecisionId','createdAt','official'],
 "recognition-offer-appeal":['id','unit','offerId','decisionId','rowAppealIds','reason','createdAt','official'],
 "recognition-offer-resolution":['id','unit','offerId','appealId','decisionId','rowResolutionIds','outcome','reason','createdAt','official'],
 "recognition-offer-withdrawal":['id','unit','offerId','reason','createdAt','official'],
  "material-delivery": ["programId","enrollmentId","planId","catalogId","lessonId","lessonDigest","taskIds","format","name","sha256","bytes","operation","official","published","externalMaterialsIncluded"],
  "advice-sample": [
    "id",
    "unit",
    "programId",
    "enrollmentId",
    "assessmentId",
    "protocolId",
    "protocolVersion",
    "origin",
    "language",
    "suggestion",
    "baselineScores",
    "rubric",
    "reason",
    "createdAt"
  ],
  "advice-compare": [
    "id",
    "unit",
    "sampleId",
    "assessmentId",
    "rows",
    "metrics",
    "reason",
    "createdAt"
  ],
  "advice-contest": [
    "id",
    "unit",
    "sampleId",
    "comparisonId",
    "reason",
    "formalNotificationAt",
    "createdAt"
  ],
  "advice-resolve": [
    "id",
    "unit",
    "sampleId",
    "contestId",
    "comparisonId",
    "outcome",
    "correctedScores",
    "reason",
    "createdAt"
  ],
  "portfolio-grant": [
    "id",
    "unit",
    "policyId",
    "policyVersion",
    "purpose",
    "enrollmentId",
    "issuanceId",
    "skillLinks",
    "evidenceIds",
    "expires",
    "createdAt"
  ],
  "portfolio-revocation": [
    "id",
    "unit",
    "grantId",
    "reason",
    "createdAt"
  ],
  "portfolio-access": [
    "id",
    "unit",
    "grantId",
    "recipientPersonId",
    "purpose",
    "createdAt"
  ],
  "portfolio-feedback": [
    "id",
    "unit",
    "grantId",
    "recipientPersonId",
    "purpose",
    "kind",
    "message",
    "createdAt"
  ],
  "application": [
    "id",
    "unit",
    "programId",
    "reason",
    "createdAt"
  ],
  "application-review": [
    "id",
    "unit",
    "programId",
    "applicationId",
    "outcome",
    "reason",
    "enrollmentId",
    "createdAt"
  ],
  "credential-receipt": [
    "id",
    "unit",
    "programId",
    "issuanceId",
    "kind",
    "externalAcceptance",
    "createdAt"
  ],
  "enrollment": [
    "id",
    "unit",
    "programId",
    "createdAt"
  ],
  "evidence": [
    "id",
    "unit",
    "programId",
    "enrollmentId",
    "taskId",
    "content",
    "sha256",
    "source",
    "alternative",
    "createdAt"
  ],
  "evidence-moderation": [
    "id",
    "unit",
    "evidenceId",
    "enrollmentId",
    "programId",
    "evidenceDigest",
    "outcome",
    "reason",
    "verificationReference",
    "version",
    "createdAt"
  ],
  "assessment": [
    "id",
    "unit",
    "programId",
    "enrollmentId",
    "evidenceIds",
    "evidenceDigests",
    "scores",
    "score",
    "passed",
    "reason",
    "createdAt",
    "resolutionId",
    "supersedesAssessmentId"
  ],
  "decision": [
    "id",
    "unit",
    "programId",
    "enrollmentId",
    "assessmentId",
    "outcome",
    "reason",
    "score",
    "programVersion",
    "createdAt",
    "resolutionId",
    "evidenceDigests"
  ],
  "appeal": [
    "id",
    "unit",
    "decisionId",
    "reason",
    "createdAt"
  ],
  "resolution": [
    "id",
    "unit",
    "appealId",
    "decisionId",
    "outcome",
    "reason",
    "createdAt"
  ],
  "issuance": [
    "id",
    "unit",
    "programId",
    "decisionId",
    "state",
    "issuer",
    "createdAt",
    "replacesId",
    "replacementProposalId",
    "replacementReviewId",
    "profileVersion"
  ],
  "share": [
    "id",
    "unit",
    "issuanceId",
    "purpose",
    "expires",
    "createdAt"
  ],
  "share-revocation": [
    "id",
    "unit",
    "shareId",
    "createdAt"
  ],
  "support": [
    "id",
    "unit",
    "subject",
    "message",
    "category",
    "state",
    "createdAt"
  ],
  "recognition-request": [
    "id",
    "unit",
    "enrollmentId",
    "policyId",
    "sourceTitle",
    "sourceIssuer",
    "sourceCredentialId",
    "sourceOutcomeKey",
    "sourceDigest",
    "targetProgramCode",
    "targetCourseCode",
    "requestedCredits",
    "remoteCredits",
    "mappingReason",
    "createdAt"
  ],
  "recognition-decision": [
    "id",
    "unit",
    "requestId",
    "policyId",
    "outcome",
    "credits",
    "remoteCredits",
    "reason",
    "authorityReference",
    "createdAt",
    "resolutionId",
    "supersedesDecisionId"
  ],
  "recognition-credit": [
    "id",
    "unit",
    "decisionId",
    "requestId",
    "targetProgramCode",
    "targetCourseCode",
    "credits",
    "createdAt"
  ],
  "recognition-reversal": [
    "id",
    "unit",
    "creditId",
    "decisionId",
    "reason",
    "createdAt"
  ],
  "privacy-request": [
    "id",
    "unit",
    "type",
    "category",
    "description",
    "submission",
    "createdAt"
  ],
  "privacy-response": [
    "id",
    "unit",
    "requestId",
    "outcome",
    "response",
    "basisReference",
    "academicRetentionReference",
    "reviewOn",
    "createdAt"
  ],
  "privacy-cleanup": [
    "id",
    "unit",
    "scope",
    "deletedSessionRows",
    "academicRecordsDeleted",
    "requestFullyFulfilled",
    "createdAt",
    "requestId",
    "responseId",
    "physicalDestructionVerified"
  ],
  "decision-receipt": [
    "id",
    "unit",
    "decisionId",
    "notification",
    "officialNotificationAt",
    "createdAt"
  ],
  "signed": [
    "id",
    "unit",
    "decisionId",
    "keyId",
    "kid",
    "pilot",
    "scope",
    "createdAt"
  ],
  "revocation": [
    "id",
    "unit",
    "issuanceId",
    "reason",
    "proposalId",
    "decisionId",
    "replacementId",
    "kind",
    "createdAt"
  ],
  "replacement-proposal": [
    "id",
    "unit",
    "previousId",
    "decisionId",
    "operation",
    "reasonType",
    "reason",
    "authorityReference",
    "profileId",
    "createdAt"
  ],
  "replacement-review": [
    "id",
    "unit",
    "proposalId",
    "outcome",
    "reason",
    "createdAt"
  ],
  "replacement-withdraw": [
    "id",
    "unit",
    "proposalId",
    "reason",
    "previousCredentialChanged",
    "createdAt"
  ],
  "replacement-completion": [
    "id",
    "unit",
    "proposalId",
    "previousId",
    "newId",
    "decisionId",
    "revocationId",
    "operation",
    "createdAt"
  ],
  "support-event": [
    "id",
    "unit",
    "ticketId",
    "type",
    "message",
    "category",
    "revision",
    "agentResponse",
    "confirmed",
    "createdAt"
  ],
  "recognition-technical": [
    "id",
    "unit",
    "requestId",
    "outcome",
    "method",
    "reportReference",
    "reason",
    "automatedVerification",
    "createdAt"
  ],
  "recognition-appeal": [
    "id",
    "unit",
    "decisionId",
    "reason",
    "createdAt"
  ],
  "recognition-resolution": [
    "id",
    "unit",
    "appealId",
    "decisionId",
    "outcome",
    "reason",
    "createdAt"
  ],
  "payment-order": [
    "id",
    "unit",
    "enrollmentId",
    "programId",
    "planId",
    "planVersion",
    "amountMinor",
    "currency",
    "provider",
    "scope",
    "collectionAuthorized",
    "cardDataReceived",
    "externalSubmitted",
    "createdAt"
  ],
  "payment-event": [
    "id",
    "unit",
    "orderId",
    "type",
    "amountMinor",
    "currency",
    "reason",
    "providerSequence",
    "scope",
    "simulated",
    "externalVerified",
    "createdAt"
  ],
  "payment-refund": [
    "id",
    "unit",
    "orderId",
    "amountMinor",
    "currency",
    "reason",
    "scope",
    "externalSubmitted",
    "createdAt"
  ],
  "payment-receipt": [
    "id",
    "unit",
    "orderId",
    "eventRecordId",
    "scope",
    "createdAt"
  ],
  "payment-reconciliation": [
    "id",
    "unit",
    "orderId",
    "revision",
    "expectedTotals",
    "observedTotals",
    "outcome",
    "reason",
    "bankSettlementVerified",
    "createdAt"
  ],
  "privacy-read": [
    "id",
    "unit",
    "requestId",
    "responseId",
    "notification",
    "createdAt"
  ],
  "privacy-withdrawal": [
    "id",
    "unit",
    "revokedCount",
    "revokedLinkCount",
    "revokedPortfolioCount",
    "academicRecordsDeleted",
    "externalAccountsChanged",
    "createdAt"
  ],
  "privacy-export": [
    "id",
    "unit",
    "recordCount",
    "ownRecordCount",
    "recipientRecordCount",
    "createdAt"
  ],
  "skill-map-issue": [
    "id",
    "unit",
    "programId",
    "mapId",
    "linkId",
    "reason",
    "academicRecordsChanged",
    "createdAt"
  ],
  "membership-proposal": [
    "id",
    "unit",
    "operation",
    "before",
    "after",
    "reason",
    "authorityReference",
    "createdAt"
  ],
  "membership-review": [
    "id",
    "unit",
    "proposalId",
    "outcome",
    "reason",
    "version",
    "revokedSessions",
    "cancelledRequests",
    "freshLoginRequired",
    "academicRecordsChanged",
    "externalIdentityChanged",
    "createdAt"
  ],
  "lms-event": [
    "id",
    "unit",
    "contractId",
    "programId",
    "enrollmentId",
    "revision",
    "type",
    "completed",
    "taskId",
    "content",
    "grade",
    "occurredAt",
    "receivedAt",
    "state",
    "registered",
    "registrationId",
    "registrationEventId",
    "createdAt"
  ],
  "lms-receipt": [
    "id",
    "unit",
    "eventId",
    "contractId",
    "state",
    "processedAt",
    "academicDecision",
    "issued",
    "createdAt"
  ],
  "lms-job": [
    "id",
    "unit",
    "eventId",
    "contractId",
    "state",
    "at",
    "attempt",
    "retryAt",
    "createdAt"
  ],
  "lms-review": [
    "id",
    "unit",
    "eventId",
    "stateId",
    "reason",
    "outcome",
    "createdAt"
  ],
  "obs-event": [
    "id",
    "unit",
    "requestId",
    "simulated",
    "target",
    "operation",
    "targetProgramCode",
    "targetCourseCode",
    "credits",
    "remoteCredits",
    "decisionId",
    "previousEventId",
    "createdAt"
  ],
  "obs-receipt": [
    "id",
    "unit",
    "eventId",
    "outcome",
    "reason",
    "simulated",
    "createdAt"
  ],
  "obs-reconciliation": [
    "id",
    "unit",
    "eventId",
    "receiptId",
    "outcome",
    "reason",
    "simulated",
    "createdAt"
  ],
  "privacy-login-preview": [
    "id",
    "unit",
    "requestId",
    "responseId",
    "scope",
    "cutoff",
    "candidateCount",
    "eligibleCount",
    "maxRows",
    "createdAt"
  ],
  "privacy-login-cleanup": [
    "id",
    "unit",
    "requestId",
    "responseId",
    "previewId",
    "scope",
    "removedRequestRows",
    "remainingEligibleRows",
    "academicRecordsDeleted",
    "identityDeleted",
    "sessionRowsDeleted",
    "securityBarriersChanged",
    "externalAccountsChanged",
    "physicalDestructionVerified",
    "requestFullyFulfilled",
    "createdAt"
  ]
};

export const kindCategory=Object.fromEntries(Object.entries(recordGroups).flatMap(([category,kinds])=>kinds.map(kind=>[kind,category])));
const scalar=true,fields=names=>Object.fromEntries(names.split(' ').map(k=>[k,scalar]));
const score=fields('criterionId score reason');
const alternative=fields('method methodReference sourceReference observedAt reason version previousEvidenceId changeReason official');
const member={...fields('unit expires active personActive'),roles:[scalar]};
const totals=fields('captured refunded refundHeld disputeHeld chargedBack available');
const nested={
 'recognition-offer':{rows:[fields('requestId')]},
 'recognition-offer-decision':{rowDecisionIds:[scalar]},
 'recognition-offer-appeal':{rowAppealIds:[scalar]},
 'recognition-offer-resolution':{rowResolutionIds:[scalar]},
 'material-delivery':{taskIds:[scalar]},
 evidence:{alternative},
 assessment:{scores:[score],evidenceIds:[scalar],evidenceDigests:[{...fields('id sha256'),alternative:{method:alternative,moderation:fields('id outcome reason verificationReference version createdAt')}}]},
 decision:{evidenceDigests:[fields('id sha256')]},
 'advice-sample':{suggestion:[score],baselineScores:[score],rubric:[{...fields('id outcomeId weight'),outcomeIds:[scalar]}]},
 'advice-compare':{rows:[fields('criterionId score baselineScore suggestionScore baselineDelta suggestionDelta reason')],metrics:fields('sampleCount criterionCount meanAbsoluteSuggestionDelta')},
 'advice-resolve':{correctedScores:[score]},
 'portfolio-grant':{skillLinks:[fields('mapId linkId')],evidenceIds:[scalar]},
 'membership-proposal':{before:member,after:member},
 'payment-reconciliation':{expectedTotals:totals,observedTotals:totals}
};
// Scalars never pass an object through. Unknown nested fields fail closed.
function select(value,schema){
 if(value===null)return null;
 if(schema===true)return ['string','number','boolean'].includes(typeof value)?value:undefined;
 if(Array.isArray(schema))return Array.isArray(value)?value.map(v=>select(v,schema[0])).filter(v=>v!==undefined):undefined;
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 return Object.fromEntries(Object.entries(schema).flatMap(([key,rule])=>{const v=select(value[key],rule);return v===undefined?[]:[[key,v]];}));
}
export function projectSubjectRecord(kind,record){return select(record,Object.fromEntries((subjectFields[kind]||[]).map(key=>[key,nested[kind]?.[key]||scalar])));}
export function projectRecipientRecord(record){return select(record,fields('id unit purpose kind message createdAt'));}
