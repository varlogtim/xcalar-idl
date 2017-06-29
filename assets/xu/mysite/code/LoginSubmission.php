<?php
    class LoginSubmission extends DataObject {
        private static $db = array(
            'Name' => 'Text',
            'Email' => 'Text',
            'stage_for_Original' => 'Int',
            'stage_for_adventure_2' => 'Int',
            'time_taken' => 'Int'
        );
    }