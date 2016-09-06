<?php
    class LoginSubmission extends DataObject {
        private static $db = array(
            'Name' => 'Text',
            'Email' => 'Text',
            'stage' => 'Int',
            'time_taken' => 'Int'
        );
    }