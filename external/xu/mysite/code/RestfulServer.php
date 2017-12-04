<?php

class RestfulServer extends Page {
}

class RestfulServer_Controller extends ContentController {

    private static $cors = array (
        'Enabled'       => true,
        'Allow-Origin'  => '*',
        'Allow-Headers' => '*',
        'Allow-Methods' => 'POST, GET, PUT, DELETE'
    );

    private static $allowed_actions = array (
        'submitExercise',
        'pullStage',
        'logout'
    );

    private static $url_handlers = array(
        'api/submitExercise' => 'submitExercise',
        'api/logout' => 'logout',
        'api/pullStage' => 'pullStage'
    );

    private static $shouldLogout = false;

    public function init() {
        parent::init();
    }

    function submitExercise() {
        $questionID = $_POST['questionID'];
        $exerciseID = $_POST['exerciseID'];
        $optionID = $_POST['optionID'];
        $userID = $_SESSION["currentUserID"];

        if (isset($questionID) &&
            isset($exerciseID) &&
            isset($optionID)
        ){
            $exercises = RegionsPageExercise::get()->filter(array(
                'ExerciseID' => $exerciseID,
            ));
            if (count($exercises) == 0) {
                return "fail";
            }
            $exercise = $exercises[0];
            $controller = RegionsPageExercise_Controller::create($exercise);
            if ($controller->saveLastSubmit()) {
                echo "success";
            } else {
                echo "fail";
            }
        }
    }

    function logout() {
        session_destroy();
        $_SESSION = [];
        echo "true";
    }

    function pullStage() {
        $stage = $_POST["stage"];
        $errorAttempt = $_POST["errorAttempt"];
        $eventCode = $_POST["EventCode"];

        if (isset($stage) &&
            isset($errorAttempt) &&
            isset($eventCode)
        ){
            $name = 'Name';
            $email = 'Email';
            $userNames = [];
            $emails = [];
            $stages = [];
            $errorAttempts = [];

            $userRecords = LoginSubmission::get()->filter(array(
                'EventCode' => $eventCode
            ));
            for ($i = 0; $i < count($userRecords); $i++) {
                $userRecord = $userRecords[$i];
                array_push($userNames, $userRecord->$name);
                array_push($emails, $userRecord->$email);
                array_push($stages, $userRecord->$stage);
                array_push($errorAttempts, $userRecord->$errorAttempt);
            }
            echo "[",json_encode($userNames), ",", json_encode($emails), ",", json_encode($stages), ",", json_encode($errorAttempts), "]";
        }
    }
}

