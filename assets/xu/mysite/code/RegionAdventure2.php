<?php

class RegionAdventure2 extends DataObject {

    private static $db = array(
        'Description' => 'Text',
        'Question' => 'Text',
        'Answer' => 'Text',
        );

    private static $has_one = array(
        'RegionsPageAdventure2' => 'RegionsPageAdventure2'
        );

    public function getCMSFields() {
        $fields = FieldList::create(
            TextareaField::create('Description'),
            TextareaField::create('Question'),
            TextField::create('Answer')
        );
        return $fields;
    }

}