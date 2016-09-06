<?php
class HomePage extends Page {


}

class HomePage_Controller extends Page_Controller {

    private static $allowed_actions = array('Form','getUserId', 'submit','getCurrentUser');

        public function Form() {
            // Create fields
            $fields = new FieldList(
                new TextField('Name'),
                new EmailField('Email')
                );

            // Create actions
            $actions = new FieldList(
                new FormAction('submit', 'Submit')
            );

            $validator = new RequiredFields('Name', 'Email');

            //Creating a Form object and returning it
            return new Form($this, 'Form', $fields, $actions, $validator);
        }

        public function submit($data, $form) {
            $submission = new LoginSubmission();
            $form->saveInto($submission);
            $userID = $submission->write();
            // Store the user ID in the session
            $_SESSION["currentUserID"] = $userID;
            // Need this time to calculate when he started so that we can get how long he took for the first question.
            date_default_timezone_set('America/Los_Angeles');
            $_SESSION["loginTime"] = date("Y-m-d H:i:s", time());

            // Set the default stage as 1
            $currUser = LoginSubmission::get()->byID($userID);
            $currUser->stage = 1;
            $currUser->write();
            $this->redirect("adventure/");
        }

}