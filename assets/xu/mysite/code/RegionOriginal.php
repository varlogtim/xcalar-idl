<?php

class RegionOriginal extends DataObject {

    private static $db = array(
        'Description' => 'Text',
        'Question' => 'Text',
        'Answer' => 'Text',
        );

    private static $has_one = array(
        'RegionsPageOriginal' => 'RegionsPageOriginal'
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