"use strict";

goog.provide('tutao.tutanota.ctrl.FeedbackViewModel');

/**
 * The ViewModel for the feedback wizard.
 * @constructor
 */
tutao.tutanota.ctrl.FeedbackViewModel = function() {
	tutao.util.FunctionUtils.bindPrototypeMethodsToThis(this);

	this.message = ko.observable("");
    this.stack = ko.observable("");
	this.image = null;
    this.addScreenshot = ko.observable(false);
	this.showDialog = ko.observable(false);
    this.showAddScreenshot = ko.observable(false);

    var self = this;
    this.isErrorDialog = ko.computed(function() {
        if (self.stack()) {
            return true;
        } else {
            return false;
        }
    });
    this.title = ko.computed(function() {
        if (self.isErrorDialog()) {
            return "errorReport_label";
        } else {
            return "feedback_label";
        }
    });
    this.infoMessage = ko.computed(function() {
        if (self.isErrorDialog()) {
            return "feedbackErrorInfo_msg";
        } else {
            return "feedbackInfo_msg";
        }
    });
};

/**
 * @param {string=} stack
 */
tutao.tutanota.ctrl.FeedbackViewModel.prototype.open = function(stack) {
	var self = this;
    if (stack) {
        this.stack(stack);
    } else {
        this.stack("");
    }
    this.message("");
	html2canvas($('body'), {
		onrendered: function(canvas) {
            try{
                var img = canvas.toDataURL();
                var string_base64 = img.split(',')[1];
                var binary_string = window.atob(string_base64);
                var len = binary_string.length;
                var bytes = new Uint8Array(len);
                for (var i = 0; i < len; i++) {
                    bytes[i] = binary_string.charCodeAt(i);
                }
                self.image = bytes.buffer;
            }catch (e){
            }
            self.showAddScreenshot(self.image != null);
            self.showDialog(true);
		},
		allowTaint: true
	});
};

tutao.tutanota.ctrl.FeedbackViewModel.prototype.close = function() {
    this.showDialog(false);
    this.image = null; // only reset image because the view is faded out and text changes would be visible. Message and stack values are reset in open()
};

tutao.tutanota.ctrl.FeedbackViewModel.prototype.sendFeedback = function() {
    var self = this;
    var attachments = [];
    if (this.image != null && this.addScreenshot()){
        var imageFile = new tutao.entity.tutanota.File();
        imageFile.setMimeType("image/png");
        imageFile.setName("screenshot.png");
        imageFile.setSize(this.image.byteLength + "");
        attachments.push(new tutao.tutanota.util.DataFile(this.image, imageFile));
    }
    var facade;
    var previousMessageId;
    if (tutao.locator.userController.isExternalUserLoggedIn()) {
        facade = tutao.tutanota.ctrl.SendMailFromExternalFacade;
        previousMessageId = ""; // dummy value for feedback mail
    } else {
        facade = tutao.tutanota.ctrl.SendMailFacade;
        previousMessageId = null;
    }
    var message = this.message()
        + "\n\n User agent: \n" + navigator.userAgent;
    if (this.isErrorDialog()) {
        message += "\n\n Stacktrace: \n" + this.stack();
    }
    message = message.split("\n").join("<br>");
    var recipient = new tutao.tutanota.ctrl.RecipientInfo("support@tutao.de", "");
    recipient.resolveType().then(function() {
        return facade.sendMail("Feedback", message, "", [recipient], [], [], tutao.entity.tutanota.TutanotaConstants.CONVERSATION_TYPE_NEW, previousMessageId, attachments, "de");
    }).then(function() {
        self.close();
    });
};