import { getCookie, setCookie, deleteCookie } from "/modules/cookies.mjs"
import { getDocumentIds } from "/modules/documents.mjs";

if (getCookie("nmd-validation")) {
  document.getElementById("logged-in-email").innerText = (JSON.parse(getCookie("nmd-validation"))).email;
  new bootstrap.Modal(document.getElementById("already-logged-in-modal")).show();
}

document.querySelector("#already-logged-in-modal #already-logged-in-modal-logout").addEventListener("click", () => {
  deleteCookie("nmd-validation");
  deleteCookie("documents");
  window.sessionStorage.removeItem("already-updated");
  emailBox.select();
  passwordBox.value = "";
});

document.querySelector("#already-logged-in-modal #already-logged-in-modal-close").addEventListener("click", () => {
  window.location.href = "/account/me/";
});

const emailBox = document.getElementById("email");
const passwordBox = document.getElementById("password");
let passwordVisible = false;

const parameters = new URLSearchParams(window.location.search);
const _redirect = parameters.get('redirect');

function showLoading(ele) {
  ele.disabled = true;
  ele.innerHTML = `<i class="fa fa-circle-o-notch fa-spin"></i>Loading`;
}

function hideLoading(ele) {
  ele.disabled = false;
  ele.innerHTML = "Login";
}

document.getElementById("submit-btn").addEventListener("click", (event) => {
  event.preventDefault();

  // get email and password
  let email = emailBox.value.trim();
  const password = passwordBox.value.trim();

  // make sure fields are not blank
  if (!email) {
    emailBox.focus();
    return;
  }
  if (!password) {
    passwordBox.focus();
    return;
  }

  // check if email exists
  new Promise((_r) => {
    showLoading(document.getElementById("submit-btn"));
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email.replace(/\./g, ',')}.json`, {
      method: 'GET'
    }).then((r) => _r(r.json()));
  }).then((r) => {
    const invalid = () => {
      emailBox.value = ""; passwordBox.value = "";
      new bootstrap.Modal(document.getElementById("invalid-login-modal")).show();
      hideLoading(document.getElementById("submit-btn"));
    };

    // check if email is registered
    if (!r) {
      invalid();
      return;
    }

    function uuid4() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // check if password matches
    if (password === r.password) {
      // login
      const d = new Date(); const today = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      getDocumentIds(email).then((documentIds) => {
        setCookie("nmd-validation", JSON.stringify({ email, password, created_on: r.created_on, last_active: today, document_count: documentIds.length }), 1);
        setCookie("documents", JSON.stringify(documentIds));
        switch (_redirect) {

          case "documents":
            document.querySelector("form").action = "/account/me/documents";
            break;

          case "me":
            document.querySelector("form").action = "/account/me/";
            break;

          case "new_document":
            window.sessionStorage.setItem("new-doc-validation", uuid4());
            document.querySelector("form").action = "/new/";
            break;

          case "document":
            console.log(parameters.get('id'))
            // 5 second delay
            new Promise((r) => setTimeout(r, 5000)).then(() => {
            if (!parameters.get('id')) {
              window.sessionStorage.setItem("new-doc-validation", uuid4());
              document.querySelector("form").action = "/new/";
            } else {
              document.querySelector("form").action = `/document/?id=${parameters.get('id')}/`;
            }});
            break;

          

        }
        document.querySelector("form").submit();
      });
    } else invalid();
  });
});

document.getElementById("email").addEventListener("keypress", (event) => {
  if (event.key === 'Enter') {
    if (!emailBox.value) return;
    if (passwordBox.value)
      document.getElementById("submit-btn").click();
    else passwordBox.focus();
  }
});

document.getElementById("password").addEventListener("keypress", (event) => {
  if (event.key === 'Enter') {
    if (!passwordBox.value) return;
    if (emailBox.value)
      document.getElementById("submit-btn").click();
    else emailBox.focus();
  }
});

document.getElementById("exampleCheck1").addEventListener("click", () => {
  if (passwordVisible) passwordBox.type = "password";
  else passwordBox.type = "text";
  passwordVisible = !passwordVisible;
});
