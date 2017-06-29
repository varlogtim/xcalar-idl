<?php

class RegionsPageAdventure2 extends RegionsPage {

    private static $has_many = array(
        'Regions' => 'RegionAdventure2',
    );
}

class RegionsPageAdventure2_Controller extends RegionsPage_Controller {

    public function fetchRegionById($Id) {
        $regs = RegionAdventure2::get()->byId($Id);
        return $regs;
    }

    public function getTotalQuestionNumber() {
        $totalQuestionNum = 9;
        return $totalQuestionNum;
    }

    public function ChildForm($pageID) {
        $page = RegionsPageAdventure2::get()->byID($pageID);
        $controller = RegionsPageAdventure2_Controller::create($page);
        return $controller->AnswerForm();
    }

    public function getAdventureName() {
        $adventureName = "Xcalar_Adventure_2";
        return $adventureName;
    }

    public function userStageUpdate($currentQuestionId, $userID, $currTime, $loginTime) {
        $currUser = LoginSubmission::get()->byID($userID);
        $currUser->stage_for_adventure_2 = $currentQuestionId;
        if($currUser->stage_for_adventure_2 == $this->getTotalQuestionNumber()) {
            $currUser->time_taken = (strtotime($currTime) - strtotime($loginTime));
        }
        $currUser->write();
    }

    public function getCurrentUserStage($userID) {
        $regs = LoginSubmission::get()->byID($userID);
        $currentUserStage = $regs->stage_for_adventure_2;
        return $currentUserStage;
    }

    public function saveUserAnswer($questionId, $userID, $userAnswer) {
        $userRecord = AnswerForAdventure2::get()->filter(array(
            'userID' => $userID
        ));
        $userRecord = $userRecord[0];
        $field = 'Answer'.$questionId;
        $userRecord->$field = $userAnswer;
        $userRecord->write();
    }

    public function getUserAnswer($questionId, $userID) {
        $userRecord = AnswerForAdventure2::get()->filter(array(
            'userID' => $userID
        ));
        $userRecord = $userRecord[0];
        $field = 'Answer'.$questionId;
        return $userRecord->$field;
    }

    public function htmlGeneration($totalQuestionNum, $bottomQuestionId, $isFirstTime, $stage) {
        $res = "";
        for($i = 1; $i <= $bottomQuestionId; $i++) {
            $regs = $this->fetchRegionById($i);
            $description = $regs->Description;
            $question = $regs->Question;
            $userAnswer = "";

            if ($i <= $totalQuestionNum) {
                $classType = "default";
                $disabled = "";
                $btnDisabled = "";
                $btnQuestion = "";

                // the previous answered questions are all shown correct
                if ($i < $bottomQuestionId || $stage == $totalQuestionNum) {
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

            }
        }

        if($stage == $totalQuestionNum) {
            $append = '<p>You have completed the adventure Successfully! </p>';
            $res = $res . $append;
        }
        return $res;
    }
}
