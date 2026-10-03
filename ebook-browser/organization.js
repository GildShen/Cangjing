'use strict';
const ResearchOrganization={
 add(links,documentId,projectId){return {...links,[documentId]:[...new Set([...(links[documentId]||[]),projectId])]};},
 remove(links,documentId,projectId){return {...links,[documentId]:(links[documentId]||[]).filter(id=>id!==projectId)};},
 deleteProject(links,projectId){return Object.fromEntries(Object.entries(links).map(([id,list])=>[id,list.filter(p=>p!==projectId)]));},
 deleteDocument(links,documentId){return Object.fromEntries(Object.entries(links).filter(([id])=>id!==documentId));}
};
if(typeof module!=='undefined')module.exports=ResearchOrganization;
else window.ResearchOrganization=ResearchOrganization;
