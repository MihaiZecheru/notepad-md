export function createNewUserModal() {
  const modal = document.createElement('div');
  // <div class="modal fade" tabindex="-1" id="new-user-modal" aria-hidden="true">
  //   <div class="modal-dialog">
  //     <div class="modal-content">
  //       <div class="modal-header">
  //         <h5 class="modal-title">New User</h5>
  //         <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
  //       </div>
  //       <div class="modal-body" id="new-user">
  //         <p>
  //           Hey there! It looks like you're new here. Welcome to Notepad MD! If you're unfamiliar with markdown or this website, you can learn more about it on our help page <a href="/help/#markdown" rel="noopener noreferrer" target="_blank">here</a>.
  //         </p>
  //       </div>
  //       <div class="modal-footer">
  //         <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
  //       </div>
  //     </div>
  //   </div>
  // </div>
  modal.classList.add('modal', 'fade');
  modal.setAttribute('tabindex', '-1');
  modal.setAttribute('id', 'new-user-modal');
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">New User</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" id="new-user">
          <p>
            Hey there! It looks like you're new here. Welcome to Notepad MD! If you're unfamiliar with markdown or this website, you can learn more about it on our help page <a href="/help/#markdown" rel="noopener noreferrer" target="_blank">here</a>.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  return modal;
}

export function showNewUserModal() {
  const modal = createNewUserModal();
  document.body.appendChild(modal);
  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

export function hideNewUserModal() {
  document.getElementById('new-user-modal')?.remove();
}