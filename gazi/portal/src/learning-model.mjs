import {seed} from '../../model.mjs';
import {lessonsFor} from './learning-data.mjs';
export const LEGACY_KEY = 'unigo-gazi-myys-v1';
export const LEARNING_KEY = 'unigo-gazi-learning-v1';
export const LEARNER_ID = 'DEMO-001';
export function readEnrollment(storage) {
 const raw = storage.getItem(LEGACY_KEY);
 const s = raw === null ? seed() : JSON.parse(raw);
 if (s?.version !== 1 || !Array.isArray(s.programs) || !Array.isArray(s.enrollments)) throw Error('Program kayıtları okunamadı. Mevcut kayıtlar değiştirilmedi.');
 return s.programs.filter(p => p && typeof p.id === 'string' && typeof p.title === 'string' && s.enrollments.includes(p.id));
}
export const emptyLearning = () => ({version:1, learners:{}});
export function readLearning(storage) {
 const raw = storage.getItem(LEARNING_KEY);
 if (raw === null) return emptyLearning();
 const s = JSON.parse(raw);
 if (s?.version !== 1 || !s.learners || typeof s.learners !== 'object' || Array.isArray(s.learners)) throw Error('İlerleme kaydı okunamadı. Mevcut kayıtlar korunuyor.');
 return s;
}
export function lessonRecord(s, owner, program, lesson) { return s.learners?.[owner]?.programs?.[program]?.lessons?.[lesson] || {}; }
export function progress(s, owner, program) {
 const lessons = lessonsFor(program), completed = lessons.filter(l => lessonRecord(s,owner,program,l.id).completed === true).length;
 return {total:lessons.length,completed,percent:lessons.length?Math.round(100*completed/lessons.length):0};
}
export function continueLesson(s, owner, program) {
 const all=lessonsFor(program), last=s.learners?.[owner]?.programs?.[program]?.lastLesson;
 return all.find(l=>l.id===last&&!lessonRecord(s,owner,program,l.id).completed) || all.find(l=>!lessonRecord(s,owner,program,l.id).completed) || all[0];
}
export function updateLearning(current, {owner,program,lesson,kind,value}, enrolled, now=new Date().toISOString()) {
 if (!owner || !/^[A-Za-z0-9]+-[A-Za-z0-9-]+$/.test(owner)) throw Error('Öğrenci kaydı geçersiz.');
 if (!enrolled.includes(program) || !lessonsFor(program).some(l=>l.id===lesson)) throw Error('Ders, öğrencinin programında bulunmuyor.');
 if (!['visit','complete','bookmark','note'].includes(kind)) throw Error('İlerleme işlemi tanınmadı.');
 if (['complete','bookmark'].includes(kind) && typeof value !== 'boolean') throw Error('Ders durumu geçersiz.');
 if (kind==='note' && (typeof value !== 'string' || value.length > 6000)) throw Error('Not en fazla 6.000 karakter olabilir.');
 const s=structuredClone(current);
 s.learners[owner] ||= {programs:{}};
 s.learners[owner].programs ||= {};
 const p=s.learners[owner].programs[program] ||= {lessons:{}};
 p.lessons ||= {};
 const l=p.lessons[lesson] ||= {};
 p.lastLesson=lesson;
 if(kind==='complete'){l.completed=value;l.completedAt=value?now:null;}
 if(kind==='bookmark')l.bookmarked=value;
 if(kind==='note')l.note=value;
 l.updatedAt=now;
 return s;
}
// Always merge the newest stored state, so another tab's different lesson survives.
export function persistLearning(storage, action) {
 const enrolled=readEnrollment(storage).map(p=>p.id);
 const next=updateLearning(readLearning(storage),action,enrolled);
 storage.setItem(LEARNING_KEY,JSON.stringify(next));
 return next;
}
