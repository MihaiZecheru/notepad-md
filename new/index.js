'use strict';

import { getCookie, setCookie } from "../modules/cookies.mjs";
import getDate from "../modules/date.mjs";

if (!getCookie("nmd-validation")) {
  window.location.href = "/account/login/?redirect=new_document";
}

function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

if (!window.sessionStorage.getItem("new-doc-validation")) {
  document.querySelector("h2").innerText = "Session Expired";
  new Promise((_r) => {
    setTimeout(() => {
      window.location.href = "/account/me/";
    }, 787);
  })
} else {
  const cookie = JSON.parse(getCookie("nmd-validation"));
  const email = cookie.email.replace(/\./g, ",");
  const document_uuid = uuid4();

  // upload new empty document
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Untitled Document",
      content: "",
      last_visit: getDate(),
      created: getDate(),
      owner: email,
      description: "",
      type: "markdown",
      visibility: "public",
      language: "en",
      theme: "default",
      font: "comfortaa",
      fontSize: 16,
      indentSize: 8,
      authors: [ email ],
    })
  }).then(() => {
    // add document to user document list
    window.sessionStorage.removeItem("new-doc-validation");
    if (!JSON.parse(getCookie("documents")).includes(document_uuid)) {
      fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${email}.json`, {
        method: "POST",
        body: JSON.stringify(document_uuid)
      }).then(() => {
        // user document count
        cookie.document_count++;
      
        fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email}/document_count.json`, {
          method: "PUT",
          body: JSON.stringify(cookie.document_count)
        }).then(() => {
            setCookie("nmd-validation", JSON.stringify(cookie));
            setCookie("documents", JSON.stringify(getCookie("documents") ? JSON.parse(getCookie("documents")).concat([ document_uuid ]) : [ document_uuid ]));
            window.location.href = `/document/edit/?id=${document_uuid}`;
        });
      });
    };
  });
}