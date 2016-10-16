<?php

class RegionsPage extends Page {


    private static $has_many = array(
        'Regions' => 'Region',
        );


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
        'isAnswerCorrect'
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

    public function ChildForm($pageID) {
        $page = RegionsPage::get()->byID($pageID);
        $controller = RegionsPage_Controller::create($page);
        return $controller->AnswerForm();
    }

    public function getQuestion($currentQuestionId ) {
        $regs = Region::get()->byId($currentQuestionId );
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
        $totalQuestionNum = 9;
        $bottomQuestionId = 1;
        $isFirstTime = true;

        // With previous submit, check whether the last submit is valid
        if (isset($_POST["answerInput"])) {
            $isCorrect = false;
            $currentQuestionId  = $_POST["questionNumber"];
            $userAnswer = strtolower($_POST["answerInput"]);
            $isCorrect = $this->isAnswerCorrect($currentQuestionId, $userAnswer, $totalQuestionNum);
            $timeDiff = strtotime($currTime) - strtotime($_SESSION["lastSubmitTime"]);
            $timeDiff = $timeDiff / 60;
            $_SESSION["answer".$currentQuestionId] = $_POST["answerInput"];

            if ($isCorrect) {
                $this->correctRecordGeneration($currentQuestionId, $timeDiff, $currTime);
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
        $res = $this->htmlGeneration($totalQuestionNum, $bottomQuestionId , $isFirstTime);

        return $res;
    }

    public function isAnswerCorrect ($currentQuestionId, $userAnswer, $totalQuestionNum) {
        $isCorrect = false;
        $regs = Region::get()->byId($currentQuestionId);
        $correctAnswers = explode(",", strtolower($regs->Answer));
        $correctAnswerNum = count($correctAnswers);
        for ($i = 0; $i < $correctAnswerNum; $i++) {
            if ($userAnswer == $correctAnswers[$i]) {
                $isCorrect = true;
                break;
            }
        }
        if($currentQuestionId == $totalQuestionNum) {
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
        $correctRecord->answer =$_POST["answerInput"];
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
        $incorrectRecord->write();
    }

    // Generate Html
    public function htmlGeneration($totalQuestionNum, $bottomQuestionId, $isFirstTime) {
        $res = "";
        for($i = 1; $i <= $bottomQuestionId; $i++) {
            $regs = Region::get()->byId($i);
            $description = $regs->Description;
            $question = $regs->Question;
            $userAnswer = "";

            if ($i < $totalQuestionNum) {
                $classType = "default";
                $disabled = "";
                $btnDisabled = "";
                $btnQuestion = "";

                // the previous answered questions are all shown correct
                if ($i < $bottomQuestionId) {
                    // show text input with correct answer
                    $classType = "correct";
                    $userAnswer = $_SESSION["answer".$i];
                    $disabled = "disabled";
                    $btnDisabled = "btn-disabled";

                // show the bottom question
                } else {
                    if ($isFirstTime == false) {
                        // show text input with error answer
                        $classType = "incorrect";
                        $userAnswer = $_SESSION["answer".$i];
                    }
                    $btnQuestion = "btnQuestion";
                }

                $res = $res.
                '<div class="region">'.
                    '<div class="description '. $btnQuestion. '" type="text">'.nl2br($description).'</div>'.
                    '<div class="question '. $btnQuestion. '" type="text">'.nl2br($question).'</div>'.
                    '<form action="'. $host . '" method="post">'.
                        '<div class="entireInput '. $classType.'">'.
                            '<input class="userInput" type="text" name="answerInput" value="'.$userAnswer.'"'.$disabled.'autocomplete="off">'.
                            '<div class="userIcon">'.
                                '<i class="icon xi-error"></i>'.
                                '<i class="icon xi-success"></i>'.
                            '</div>'.
                            '<input type="hidden" name="questionNumber" value="'.$bottomQuestionId .'">'.
                        '</div>'.
                        '<button class="'. $classType . ' btn '. $btnDisabled.' " >SUBMIT</button> <br>'.
                    '</form>'.
                '</div>';

            } else {
                // show text area
                $classType = "";
                $append = "";
                $disabled = "";
                $btnDisabled = "";
                $btnQuestion = "";

                if($isFirstTime == false) {
                    $userAnswer = $_SESSION["answer".$i];
                    $classType = "correct";
                    $append = '<p>You have completed the adventure Successfully! </p>';
                    $disabled = "disabled";
                    $btnDisabled = "btn-disabled";
                } else {
                    $btnQuestion = "btnQuestion";
                }

                $res = $res.
                '<div class="region">'.
                    '<div class="description '. $btnQuestion. '" type="text">'.nl2br($description).'</div>'.
                    '<div class="question '. $btnQuestion.'" type="text">'.nl2br($question).'</div>'.
                    '<form class="textareaForm" action="'.$host.'" method="post" id="formID">'.
                    '<div class="textareaContainer">'.
                    '<textarea class="textarea-lastQuestion '. $classType .'" name="answerInput" form="formID"' .$disabled.'>'. $userAnswer .'</textarea>'.
                            '<input type="hidden" name="questionNumber" value="'.$bottomQuestionId .'">'.
                            '<button class="btn-textarea '. $classType . ' btn '. $btnDisabled.' " >SUBMIT</button>'.
                    '</div>'. $append.
                    '</form>'.
                '</div>';      
            }

        }

        return $res;

    }


}
