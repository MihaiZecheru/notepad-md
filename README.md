# Notepad MD
#### Video Demo: https://youtu.be/ZHJ26JEOcz4
#### Description
Notepad MD is an efficient, lightweight markdown editor where your documents, which can be written or uploaded, are safely stored using Google's Realtime Database.
While markdown is a universal text format, Notepad MD's markdown is slightly different than what you might be used to. An abundance of shortcuts and tools make it easy to write and edit your documents using the supported markdown listed below.
When you're done writing, you can export or print the document's markdown and compiled HTML to a variety of formats, including PDF, HTML, and plain text.
The HTML and markdown can be copied to your clipboard, making it easy to move your document elsewhere, for example a Canvas assignment or an important email.

If you're not all that interested in markdown, Notepad MD offers support for plain text and code making it easy to store your non-markdown files for later use.
All documents can be opened in [/document/view/](https://notes.mzecheru.com/document/view/), making Notepad MD a great way to save important documents, even if they're not made by using the supported markdown.

Notes:
- This text editor is designed to be used on a desktop, laptop, or tablet, meaning it's not recommended for use on a mobile device.
- A feature for accessing documents via API will be developed sometime in the future.

After creating your account [here](https://notes.mzecheru.com/account/register/), you will have full access to Notepad MD and all of it's features. To make an account, go to 
[/account/me/](https://notes.mzecheru.com/account/me/) and click "New Document". You will then be redirected to the main page of the website where you will be spending most of your time: [/document/edit/](https://notes.mzecheru.com/document/edit).

The markdown you write in the right textbox will be compiled into HTML and displayed on the left side of the screen when the "Save" button is clicked or the Ctrl+S shortcut is used. 
All documents can be viewed in the [Documents](https://notes.mzecheru.com/account/me/documents/) tab, where you can edit, view, delete, export, or share any of your documents to other users.
When sharing a document to another user, note that they will only be able to view it while the document is set to "public" - if you want them to be able to edit the document as well, add them as an author, which can be done by viewing the document settings.

#### File Breakdown
*./index.html*: Root - two options to proceed with nmd; login or register. This page will automatically redirect all who are already logged in to [/account/me/](https://notes.mzecheru.com/account/me/).
*./styles.css*: CSS styles for root.

*./default.css*: Default stylings to be applied to every page - includes stylings for the footer.
*./default.js*: Javascript to be applied to every page - handles account-switches, functionality for the footer, and more.

***./static/***: Static resources - images, videos, etc. used throughout the website.

***New***: Create a new document.
- *./new/index.html*: Constructs the page where new documents are created.
- *./new/index.js/*: Created a new, blank document for the user. Will not create a second document if the user refreshes the page after the first is created to prevent accidental duplicates.

***Modules***: Scripts and styles to be imported in other areas to make developing the website easier for me.
- *./modules/bootstrap-menu.js*: Right-click functionality for the cards in [/account/me/documents/](https://notes.mzecheru.com/account/me/documents/).
- *./modules/checkbox_ids.mjs*: List of ids to be assigned to checkboxes created in markdown. This is to keep all ids consistent, which makes the feature for saving the status of checkboxes possible.
- *./modules/cookies.mjs*: Functions for getting, setting, and removing cookies.
- *./modules/date.mjs*: Function for getting the current date in mm/dd/yyyy format to keep records consistent.
- *./modules/documents.mjs*: Function for getting every id that a user has.
- *./modules/generate_password.mjs*: Function to generate a password for a user.
- *./modules/max_lengths.mjs*: Variables for determining the greatest length a card title and body can be, for use in [/account/me/documents/](https://notes.mzecheru.com/account/me/documents).
- *./modules/new-user-modal.mjs*: Functions for creating, showing, and removing the "New User Modal," which is opened the first time a user goes to [/document/edit/](https://notes.mzecheru.com/document/edit/)
- *./modules/show_footer.js*: Function for displaying the footnote banner, which shows the content defined in a footnote. Used in [/document/edit/](https://notes.mzecheru.com/document/edit/) and [/document/view/](https://notes.mzecheru.com/document/view/).
- *./modules/snackbar.css*: Stylings for the "Successfully Copied" snackbar.
- *./modules/update_last_active.mjs*: Javascript for updating the user's "last_active" property in the database.

***Help***: Essentially the website's documentation. Features an introduction, shortcuts, and an example of every supported markdown and its syntax.
- *./help/index.html*: Constructs the help page and adds Javascript for copying the href to an element by clicking on it.
- *./help/style.css*: Styling for the help page.

***Document***: 
- **Copy**: Create a copy of a document.
  - *./document/copy/index.html*: Constructs the page for copying a document.
  - *./document/copy/index.js*: Copies the document based on the given id in the href to the user's own collection of documents.
  - *./document/copy/styles.css*: Constructs the page for copying a document.

- **Edit**: Edit an existing document - only listed authors of the document can view this page.
  - *./document/edit/index.html*: Constructs the page for editing a document.
  - *./document/edit/index.js*: Handles the page shortcuts, export options, page buttons, markdown compiling, uploading the document to the server, checkbox status, and all other nmd functionality.
  - *./document/edit/styles.css*: Constructs the page for editing a document.

- **View**: View a document - anybody with the link can view a document as long as its visibility is set to public.
  - *./document/view/index.html*: Constructs the page for viewing a document.
  - *./document/view/index.js*: Handles the page shortcuts, export options, markdown compiling, and checkbox status.
  - *./document/view/styles.css*: Constructs the page for viewing a document.

***Account***: Login, register, create a new document, or view your account / existing documents.
- *./index.html*: This page does not have any content, so if the user is signed in they will be redirected to [/account/me/](https://notes.mzecheru.com/account/me/), otherwise they will be redirected to [/account/login/](https://notes.mzecheru.com/account/login/).

- **Login**: Login to an existing nmd account.
  - *./account/login/index.html*: Constructs the page for logging in.
  - *./account/login/index.js*: Handles error checking and the login of the user.
  - *./account/login/styles.css*: Constructs the page for logging in.

- **Register**: Register an nmd account.
  - *./account/register/index.html*: Constructs the page for registering an account with nmd.
  - *./account/register/index.js*: Handles error checking and the registering of the user to the database.
  - *./account/register/styles.css*: Constructs the page for registering an account with nmd.

- **Me**: View your account (and make changes if necessary), view your existing documents, or create a new document.
- *./account/me/index.html*: Constructs the page - has three cards; one to forward the user to view their account, another to forward the user to view their existing documents, and another to create a new document for the user.
- *./account/me/index.js*: Handles the redirects for each card on the page.
- *./account/me/styles.css*: CSS styles for [/account/me/](https://notes.mzecheru.com/account/me/).

- **Documents**: View your existing documents.
  - *./account/me/documents/index.html*: Constructs the page for viewing existing documents. Initially only contains the "Create New Document" card and a series of skeleton cards that will be filled later.
  - *./account/me/documents/index.js*: Gets a user's documents from the database and creates a card for each one. A context menu is applied to each card with options for previewing, summarizing, sharing, opening, renaming, or deleting the document.
  - *./account/me/documents/style.css*: Constructs the page for viewing existing documents. Overrides default scrollbar styles for the cards.

- **Info**: View your account information and make changes if necessary.
  - *./account/me/info/index.html*: Constructs the page for viewing account information.
  - *./account/me/info/index.js*: Handles email or password changes and fills in the account information for the page such as document count, email, password, etc.
  - *./account/me/info/styles.css*: Constructs the page for viewing account information.