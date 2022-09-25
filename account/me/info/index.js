import { getCookie, setCookie, deleteCookie } from "../../../modules/cookies.mjs";
import { generatePassword } from "../../../modules/generate_password.mjs";

const emailBox = document.getElementById("email-box");
const passwordBox = document.getElementById("password-box");
let passwordVisible = false;

const c = JSON.parse(getCookie("nmd-validation"));
const email = c.email;
const password = c.password;
const created_on = c.created_on;
const document_count = c.document_count;
let password_hidden = ""; for (let i = 0; i < password.length; i++) password_hidden += "*";

document.getElementById("email").innerText = `Email: ${email}`;
document.getElementById("password").innerText = `Password: ${password_hidden}`;
document.getElementById("created-on").innerText = `Account Created: ${created_on}`;
document.getElementById("document-count").innerText = `Document Count: ${document_count}`;

document.getElementById("show-password").addEventListener("click", () => {
  if (passwordVisible) {
    passwordBox.type = "password";
    document.getElementById("password").innerText = `Password: ${password_hidden}`
  }
  else {
    passwordBox.type = "text";
    document.getElementById("password").innerText = `Password: ${password}`;
  }
  passwordVisible = !passwordVisible;
});

function showLoadingEmail() {
  const ele = document.getElementById("change-email");
  ele.disabled = true;
  ele.innerHTML = `<i class="fa fa-circle-o-notch fa-spin"></i>Loading`;
}

function showLoadingPassword() {
  const ele = document.getElementById("change-password");
  ele.disabled = true;
  ele.innerHTML = `<i class="fa fa-circle-o-notch fa-spin"></i>Loading`;
}

document.getElementById("change-email").addEventListener("click", (event) => {
  event.preventDefault();
  const email = emailBox.value.trim();

  // make sure field is not blank
  if (!email) return;
  
  // validate email
  const regex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  if (!email.match(regex)) {
    new bootstrap.Modal(document.getElementById("invalid-em-modal")).show();
    emailBox.value = "";
    return;
  }

  document.getElementById("em-modal-body-text").innerText = `Are you sure you want to change your account's email to "${email}"? Note: you will be logged out after your email is changed and will be required to log back in.`;
  new bootstrap.Modal(document.getElementById("em-modal")).show();
});

document.getElementById("change-password").addEventListener("click", (event) => {
  event.preventDefault();
  const password = passwordBox.value.trim();

  // make sure field is not blank
  if (!password) return;

  // validate password
  if (password.length < 8) {
    new bootstrap.Modal(document.getElementById("pw-too-short-modal")).show();
    passwordBox.value = "";
    return;
  }
  
  document.querySelector("#pw-modal .modal-body").innerText = `Are you sure you want to change your account's password "${password}"? Note: you will be logged out after your password is changed and will be required to log back in.`;
  new bootstrap.Modal(document.getElementById("pw-modal")).show();
});

document.getElementById("yes-change-email").addEventListener("click", () => {
  const email = emailBox.value.trim();
  emailBox.value = "";
  
  // check if account exists
  new Promise((_r) => {
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email.replace(/\./g, ',')}.json`, {
      method: 'GET',
    }).then((r) => _r(r.json()));
  }).then((r) => {
    // if r has a value, the account already exists
    if (r) {
      document.getElementById("account-already-exists-em-modal-text").innerText = `An account with the email "${email}" already exists.`;
      new bootstrap.Modal(document.getElementById("account-already-exists-em-modal")).show();
    }
    return !!r;
  }).then((quit) => {
    if (quit) return;
    const cookie = JSON.parse(getCookie("nmd-validation")); delete cookie["email"];

    // change email
    new Promise((_r) => {
      const d = new Date(); const today = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      showLoadingEmail(document.getElementById("submit-btn"));
      fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email.replace(/\./g, ",")}.json`, {
        method: 'PUT',
        body: JSON.stringify(cookie)
      }).then(_r());
    }).then((new_email) => {
      const old_email = JSON.parse(getCookie("nmd-validation")).email;
      window.sessionStorage.setItem("already-updated", "1");
      setCookie("nmd-validation", JSON.stringify({ email, ...cookie }));

      // delete original account
      new Promise((_r) => {
        fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${old_email.replace(/\./g, ",")}.json`, {
        method: 'DELETE',
      }).then((r) => r.json()).then((r) => _r(new_email));
      }).then((new_email) => {
        // copy the new email to clipboard
        navigator.clipboard.writeText(new_email);
        // sign out
        deleteCookie("nmd-validation");
        deleteCookie("documents");
        window.sessionStorage.removeItem("already-updated");
        // send user to login
        document.querySelector("form").submit();
      });
    });
  });
});

document.getElementById("yes-change-password").addEventListener("click", () => {
  const password = passwordBox.value.trim();
  passwordBox.value = "";
  
  // check if given password is the current password
  if (password === JSON.parse(getCookie("nmd-validation")).password) {
    new bootstrap.Modal(document.getElementById("pw-is-same-modal")).show();
    return;
  }

  // change password
  new Promise((_r) => {
    showLoadingPassword(document.getElementById("submit-btn"));
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email.replace(/\./g, ",")}/password.json`, {
      method: 'PUT',
      body: JSON.stringify(password)
    }).then(r => r.json()).then(_r(password));
  }).then((password) => {
    // copy the current password to clipboard
    navigator.clipboard.writeText(password);
    // sign out
    deleteCookie("nmd-validation");
    window.sessionStorage.removeItem("already-updated");
    // send user to login
    document.querySelectorAll("form")[1].submit();
  });
});

document.getElementById("no-change-email").addEventListener("click", () => {
  if (emailBox.value) emailBox.value = "";
});

document.getElementById("no-change-password").addEventListener("click", () => {
  if (passwordBox.value) passwordBox.value = "";
});

emailBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (emailBox.value) document.getElementById("change-email").click();
  }
});

passwordBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (passwordBox.value) document.getElementById("change-password").click();
  }
});

document.getElementById("generate-password-btn").addEventListener("click", () => {
  passwordBox.value = generatePassword(32);
});

document.getElementById("delete-account").addEventListener("click", () => {
  const email = JSON.parse(getCookie("nmd-validation")).email;
  document.querySelector("#delete-account-modal .modal-body").innerText = `Are you sure you want to delete your account (${email})? You will lose all of your saved documents and the account will be gone forever.`;
  new bootstrap.Modal(document.getElementById("delete-account-modal")).show();
});

document.getElementById("yes-delete-account").addEventListener("click", () => {
  document.body.innerHTML = `<div style="width: 100%; height: 100%;" class="justify-content align-items"><h1 style="margin-right: 2vh;">Loading...</h1><div class="spinner-border text-primary" role="status"></div></div>`;
  
  const email = JSON.parse(getCookie("nmd-validation")).email;
  new Promise((_r) => {
    // delete /users/email
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email.replace(/\./g, ",")}.json`, {
      method: 'DELETE',
  }).then((r) => r.json()).then(() => _r());
  }).then(() => {
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${email.replace(/\./g, ",")}.json`, {
      method: 'GET',
    }).then((r) => r.json()).then(async (d) => {
      const users_documents = d ? Object.values(d) : [];
      await users_documents.forEach(async (id) => {
        await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${id}.json`, {
          method: 'DELETE',
        });
      });
   
      // delete /documents_id_list/email
      await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${email.replace(/\./g, ",")}.json`, {
        method: 'DELETE',
      }).then((r) => r.json()).then(() => {
        document.body.innerHTML = "";
        // sign out
        deleteCookie("nmd-validation");
        deleteCookie("documents");
        window.sessionStorage.removeItem("already-updated");
        // send user to registration
        window.location.href = "/account/register/";
      });
    });
  });
});

document.getElementById("logout").addEventListener("click", () => {
  deleteCookie("nmd-validation");
  deleteCookie("documents");
  window.sessionStorage.removeItem("already-updated");
  window.location.href = "/account/login/";
});