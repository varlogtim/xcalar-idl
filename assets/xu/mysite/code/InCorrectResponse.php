<?php
class InCorrectResponses extends DataObject {
    private static $db = array (
        'user_id' => 'Int',
        'question_num' => 'Int',
        'time_taken' => 'Int',
        'time_submitted' => 'Text(100)',
        'answer'=> 'Text(100)',
        'adventure_name'=> 'Text(100)'
    );
}