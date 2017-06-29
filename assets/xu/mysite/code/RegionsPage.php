<?php

class RegionsPage extends Page {

    public function getCMSFields() {
        $fields = parent::getCMSFields();
        $fields->addFieldToTab('Root.Regions', GridField::create(
            'Regions',
            'Regions on this page',
            $this->Regions(),
            GridFieldConfig_RecordEditor::create()
        ));

        return $fields;
    }

}

class RegionsPage_Controller extends Page_Controller {

    private static $allowed_actions = array(
        'AnswerForm',
        'handleSubmit',
        'ChildForm',
        'getQuestion',
        'getCurrentUserName',
        'getCurrentUserEmail',
        'nextQuestion',
        'htmlGeneration',
        'correctRecordGeneration',
        'inCorrectRecordGeneration',
        'isAnswerCorrect',
        'fetchRegionById',
        'getTotalQuestionNumber',
        'getAdventureName'
    );

    public function AnswerForm() {
        $fields = new FieldList(
            TextField::create('answerInput', '')
        );
        $actions = new FieldList(
            FormAction::create('handleSubmit', 'Submit')
            ->setUseButtonTag(true)
        );
        $required = new RequiredFields('answerInput');
        $form = new Form($this, 'AnswerForm', $fields, $actions);
        $form->setFormMethod('POST');
        return $form;
    }

    public function handleSubmit($data, $form) {
        echo $data['answerInput'];
        $form->sessionMessage('Thanks for your comment', 'good');
        return $this.redirectBack();
    }

    public function getQuestion($currentQuestionId) {
        $regs = $this->fetchRegionById($currentQuestionId);
        $question = $regs->Question;
        return $question;
    }

    public function getCurrentUserName() {
        $userID = $_SESSION["currentUserID"];
        $regs = LoginSubmission::get()->byID($userID);
        $currentUser = $regs->Name;
        return $currentUser;
    }

    public function getCurrentUserEmail() {
        $userID = $_SESSION["currentUserID"];
        $regs = LoginSubmission::get()->byID($userID);
        $currentUserEmail = $regs->Email;
        return $currentUserEmail;
    }

    public function nextQuestion() {
        date_default_timezone_set('America/Los_Angeles');
        $currTime = date("Y-m-d H:i:s", time());
        $res = "";
        $isCorrect = false;
        // How many question here totally?
        $totalQuestionNum = $this->getTotalQuestionNumber();
        // The id of the last question shown on the screen
        $stage = $this->getCurrentUserStage($_SESSION["currentUserID"]);
        if($stage == $totalQuestionNum) {
            $bottomQuestionId = $stage;
            $isFirstTime = false;
        } else {
            $bottomQuestionId = $stage + 1;
            $isFirstTime = true;
        }

        // With previous submit, check whether the last submit is valid
        if (isset($_POST["answerInput"])) {
            $isCorrect = false;
            $currentQuestionId  = $_POST["questionNumber"];
            $userAnswer = trim(strtolower($_POST["answerInput"]));
            $isCorrect = $this->isAnswerCorrect($currentQuestionId, $userAnswer, $totalQuestionNum);
            $timeDiff = strtotime($currTime) - strtotime($_SESSION["lastSubmitTime"]);
            $timeDiff = $timeDiff / 60;

            $this->saveUserAnswer($currentQuestionId, $_SESSION["currentUserID"], $_POST["answerInput"]);

            if ($isCorrect) {
                $this->correctRecordGeneration($currentQuestionId, $timeDiff, $currTime);
                $this->userStageUpdate($currentQuestionId, $_SESSION["currentUserID"], $currTime, $_SESSION["loginTime"]);
                if ($currentQuestionId  < $totalQuestionNum) {
                    // show the next question
                    $bottomQuestionId = $currentQuestionId + 1;
                    $isFirstTime = true;
                } else {
                    // no question below, and this question is not the first time to show up
                    $bottomQuestionId = $currentQuestionId;
                    $isFirstTime = false;
                }

            } else {
                $this->inCorrectRecordGeneration($currentQuestionId, $timeDiff, $currTime);
                // the answer is wrong, keep showing the same question
                $bottomQuestionId = $currentQuestionId;
                $isFirstTime = false;
            }

        }

        $_SESSION["lastSubmitTime"] = $currTime;
        $stage = $this->getCurrentUserStage($_SESSION["currentUserID"]);
        $res = $this->htmlGeneration($totalQuestionNum, $bottomQuestionId , $isFirstTime, $stage);

        return $res;
    }

    public function isAnswerCorrect ($currentQuestionId, $userAnswer, $totalQuestionNum) {
        $isCorrect = false;
        $regs = $this->fetchRegionById($currentQuestionId);
        $correctAnswers = explode(",", strtolower($regs->Answer));
        $correctAnswerNum = count($correctAnswers);
        for ($i = 0; $i < $correctAnswerNum; $i++) {
            if ($userAnswer == $correctAnswers[$i]) {
                $isCorrect = true;
                break;
            }
        }
        $isOriginal = ($this->getAdventureName() == "Xcalar_Adventure_Original");
        if($currentQuestionId == $totalQuestionNum && $isOriginal) {
            $isCorrect = true;
        }
        return $isCorrect;
    }

    // insert the answer into the QuestionResponses.php
    public function correctRecordGeneration ($currentQuestionId, $timeDiff, $currTime) {
        $correctRecord = CorrectResponses::create();
        $correctRecord->user_id = $_SESSION["currentUserID"];
        $correctRecord->question_num = $currentQuestionId ;
        $correctRecord->time_taken = $timeDiff;
        $correctRecord->time_submitted = $currTime;
        $correctRecord->answer = $_POST["answerInput"];
        $correctRecord->adventure_name = $this->getAdventureName();
        $correctRecord->write();

        $currUser = LoginSubmission::get()->byID($_SESSION["currentUserID"]);
        $currUser->stage = $currentQuestionId  + 1;
        if($currUser->stage == 10) {
            $currUser->time_taken = (strtotime($currTime) - strtotime($_SESSION["loginTime"]));
        }
        $currUser->write();
    }

    // Insert this incorrect answer into the InCorrectResponse.php
    public function inCorrectRecordGeneration($currentQuestionId, $timeDiff, $currTime) {
        $incorrectRecord = InCorrectResponses::create();
        $incorrectRecord->user_id =  $_SESSION["currentUserID"];
        $incorrectRecord->question_num = $currentQuestionId ;
        $incorrectRecord->time_taken = $timeDiff;
        $incorrectRecord->time_submitted = $currTime;
        $incorrectRecord->answer =$_POST["answerInput"];
        $incorrectRecord->adventure_name = $this->getAdventureName();
        $incorrectRecord->write();
    }
}
