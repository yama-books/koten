/* Display projection shared by the record screen and the group total. */
(function(root){
  'use strict';
  function completedIds(events){
    const counts=new Map();
    for(const e of events)if(e.setId)counts.set(e.setId,(counts.get(e.setId)||0)+1);
    return new Set([...counts].filter(([,n])=>n>=5).map(([id])=>id));
  }
  function total(learning,decipher){
    const completed=completedIds(learning),decoded=completedIds(decipher);
    return learning.reduce((n,e)=>n+(e.setId&&completed.has(e.setId)?e.outcome==='correct'?10:1:0),0)
      +decipher.reduce((n,e)=>n+(e.setId&&decoded.has(e.setId)?e.correct?10:1:0),0);
  }
  root.VintageKanaPoints=Object.freeze({total});
})(typeof window==='undefined'?globalThis:window);
