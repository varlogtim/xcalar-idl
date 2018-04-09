var DFParamModal;
(function (DFParamModal) {
    var ParamModal = /** @class */ (function () {
        function ParamModal() {
            this.isOpen = false;
        }
        ParamModal.prototype.setup = function () {
            var self = this;
            this.$paramModal = $("#dfParamModal2");
            this.modalHelper = new ModalHelper(this.$paramModal);
            this.$paramModal.find('.cancel, .close').click(function () {
                self.closeParamModal();
            });
        };
        ParamModal.prototype.show = function ($triggeredIcon) {
            var deferred = PromiseHelper.deferred();
            if (this.isOpen) {
                return PromiseHelper.reject();
            }
            else {
                this.isOpen = true;
            }
            this.type = $triggeredIcon.data("type");
            this.tableName = $triggeredIcon.data("table") || // for aliased tables
                $triggeredIcon.data("tablename");
            this.altTableName = $triggeredIcon.data("altname");
            this.dfName = DFCard.getCurrentDF();
            var df = DF.getDataflow(dfName);
            this.modalHelper.setup();
            deferred.resolve();
            return deferred.promise();
            // $dfParamModal.removeClass("type-dataStore type-filter type-export " +
            //                      "multiExport");
            // $dfParamModal.addClass("type-" + type);
        };
        ParamModal.prototype.closeParamModal = function () {
            this.modalHelper.clear();
            this.isOpen = false;
        };
        return ParamModal;
    }());
})(DFParamModal || (DFParamModal = {}));
