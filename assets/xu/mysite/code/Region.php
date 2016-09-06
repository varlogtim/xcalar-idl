<?php

class Region extends DataObject {
    private static $db = array(
        'Description' => 'Text',
        'Question' => 'Text',
        'Answer' => 'Text',
        );

    private static $has_one = array(
        'RegionsPage' => 'RegionsPage'
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
