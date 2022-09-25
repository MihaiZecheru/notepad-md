import { setCookie } from "/modules/cookies.mjs";
import { generatePassword } from "/modules/generate_password.mjs";

const emailBox = document.getElementById("email");
const passwordBox = document.getElementById("password");
let passwordVisible = false;

const parameters = new URLSearchParams(window.location.search);
const _r = parameters.get('redirect');

function showLoading(ele) {
  ele.disabled = true;
  ele.innerHTML = `<i class="fa fa-circle-o-notch fa-spin"></i>Loading`;
}

document.querySelector("button").addEventListener("click", () => {
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

  // validate email
  const regex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  if (!email.match(regex)) {
    new bootstrap.Modal(document.getElementById("em-modal")).show();
    return;
  }

  // validate password
  if (password.length < 8) {
    new bootstrap.Modal(document.getElementById("pw-modal")).show();
    return;
  }

  // check if account exists
  new Promise((_r) => {
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email.replace(/\./g, ',')}.json`, {
      method: 'GET',
    }).then((r) => _r(r.json()));
  }).then((r) => {
    // if r has a value, the account already exists
    if (r) {
      // change modal text to show existing email
      document.querySelector(`#account-exists-modal div[class="modal-body"]`).innerText = `An account with the email "${email}" already exists.`;

      // show modal
      new bootstrap.Modal(document.getElementById("account-exists-modal")).show();
    }
    return !!r;
  }).then((quit) => {
    if (quit) return;

    // register
    new Promise((_r) => {
      const d = new Date(); const today = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      showLoading(document.getElementById("submit-btn"));
      fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${email.replace(/\./g, ",")}.json`, {
        method: 'PUT',
        body: JSON.stringify({ password, created_on: today, last_active: today, document_count: 0 })
      }).then(() => _r(today));
    }).then((today) => {
      window.sessionStorage.setItem("already-updated", "1");
      setCookie("nmd-validation", JSON.stringify({ email, password, created_on: today, last_active: today, document_count: 0 }));
      setCookie("documents", JSON.stringify([]));
      if (_r === "new")
        document.querySelector("form").action = "new";
      document.querySelector("form").submit();
    });
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

document.getElementById("gen-pw-btn").addEventListener("click", () => {
  passwordBox.value = generatePassword(32);
});

document.getElementById("login-modal-btn").addEventListener("click", () => {
  window.location.href = "/account/login/" + (_r === "new" ? "?redirect=new" : "");
});

document.getElementById("exampleCheck1").addEventListener("click", () => {
  if (passwordVisible) passwordBox.type = "password";
  else passwordBox.type = "text";
  passwordVisible = !passwordVisible;
});
