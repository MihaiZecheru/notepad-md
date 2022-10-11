import { getCookie, setCookie } from '/modules/cookies.mjs';

const parameters = new URLSearchParams(window.location.search);
const document_uuid = parameters.get('id');

fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}/title.json`, {
  method: "GET",
}).then(r => r.json()).then(title => {
  document.getElementById("document-name").innerText = title;
});

function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

document.getElementById("copy-btn").addEventListener("click", () => {
  document.body.style.opacity = "50%";
  document.getElementById("copy-btn").disabled = true;
  document.body.style.cursor = "wait";

  const cookie = JSON.parse(getCookie("nmd-validation"));
  const email = cookie.email.replace(/\./g, ",");
  const new_uuid = uuid4();

  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
    method: "GET"
  }).then(r => r.json()).then(doc => {
    doc.last_visit = Date.now();
    doc.created = Date.now();
    doc.owner = email;

    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${new_uuid}.json`, {
      method: "PUT",
      body: JSON.stringify(doc)
    }).then(r => r.json()).then(() => {
      fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${email}.json`, {
        method: "POST",
        body: JSON.stringify(new_uuid)
      }).then(() => {
        // user document count
        cookie.document_count++;

        fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email}/document_count.json`, {
          method: "PUT",
          body: JSON.stringify(cookie.document_count)
        }).then(() => {
          setCookie("nmd-validation", JSON.stringify(cookie));
          setCookie("documents", JSON.stringify(getCookie("documents") ? JSON.parse(getCookie("documents")).concat([ new_uuid ]) : [ new_uuid ]));
          window.location.href = `/document/edit/?id=${new_uuid}`;
        });
      });
    });
  });
});