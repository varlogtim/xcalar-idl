<?php

class RegionsPageOriginal extends RegionsPage {

    private static $has_many = array (
        'Regions' => 'RegionOriginal',
    );
}

class RegionsPageOriginal_Controller extends RegionsPage_Controller {

    public function fetchRegionById($Id) {
        $regs = RegionOriginal::get()->byId($Id);
        return $regs;
    }

    public function getTotalQuestionNumber() {
        $totalQuestionNum = 9;
        return $totalQuestionNum;
    }

    public function ChildForm($pageID) {
        $page = RegionsPageOriginal::get()->byID($pageID);
        $controller = RegionsPageOriginal_Controller::create($page);
        return $controller->AnswerForm();
    }

    public function getAdventureName() {
        $adventureName = "Xcalar_Adventure_Original";
        return $adventureName;
    }

    public function userStageUpdate($currentQuestionId, $userID, $currTime, $loginTime) {
        $currUser = LoginSubmission::get()->byID($userID);
        $currUser->stage_for_Original = $currentQuestionId;
        if($currUser->stage_for_Original == $this->getTotalQuestionNumber()) {
            $currUser->time_taken = (strtotime($currTime) - strtotime($loginTime));
        }
        $currUser->write();
    }

    public function getCurrentUserStage($userID) {
        $regs = LoginSubmission::get()->byID($userID);
        $currentUserStage = $regs->stage_for_Original;
        return $currentUserStage;
    }

    public function saveUserAnswer($questionId, $userID, $userAnswer) {
        $userRecord = AnswerForAdventureOriginal::get()->filter(array(
            'userID' => $userID
        ));
        $userRecord = $userRecord[0];
        $field = 'Answer'.$questionId;
        $userRecord->$field = $userAnswer;
        $userRecord->write();
    }

    public function getUserAnswer($questionId, $userID) {
        $userRecord = AnswerForAdventureOriginal::get()->filter(array(
            'userID' => $userID
        ));
        $userRecord = $userRecord[0];
        $field = 'Answer'.$questionId;
        return $userRecord->$field;
    }

    // Generate Html
    public function htmlGeneration($totalQuestionNum, $bottomQuestionId, $isFirstTime) {
        $res = "";
        for($i = 1; $i <= $bottomQuestionId; $i++) {
            $regs = $this->fetchRegionById($i);
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
                    $userAnswer = $this->getUserAnswer($i, $_SESSION["currentUserID"]);

                    $disabled = "disabled";
                    $btnDisabled = "btn-disabled";

                // show the bottom question
                } else {
                    if ($isFirstTime == false) {
                        // show text input with error answer
                        $classType = "incorrect";
                        $userAnswer = $this->getUserAnswer($i, $_SESSION["currentUserID"]);
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
                    $userAnswer = $this->getUserAnswer($i, $_SESSION["currentUserID"]);
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