import { EVENTS } from "../constants";
import AutofillScript, { FillScript, FillScriptActions } from "../models/autofill-script";
import { FillableFormFieldElement, FormElementWithAttribute, FormFieldElement } from "../types";

import CollectAutofillContentService from "./collect-autofill-content.service";
import DomElementVisibilityService from "./dom-element-visibility.service";
import InsertAutofillContentService from "./insert-autofill-content.service";

const mockLoginForm = `
  <div id="root">
    <form>
      <input type="text" id="username" />
      <input type="password" />
    </form>
  </div>
`;

const eventsToTest = [
  EVENTS.CHANGE,
  EVENTS.INPUT,
  EVENTS.KEYDOWN,
  EVENTS.KEYPRESS,
  EVENTS.KEYUP,
  "blur",
  "click",
  "focus",
  "focusin",
  "focusout",
  "mousedown",
  "paste",
  "select",
  "selectionchange",
  "touchend",
  "touchstart",
];

const initEventCount = Object.freeze(
  eventsToTest.reduce(
    (eventCounts, eventName) => ({
      ...eventCounts,
      [eventName]: 0,
    }),
    {}
  )
);

let confirmSpy: jest.SpyInstance<boolean, [message?: string]>;
let windowSpy: jest.SpyInstance<any>;
let savedURLs: string[] | null = ["https://bitwarden.com"];
function setMockWindowLocationProtocol(protocol: "http:" | "https:") {
  windowSpy.mockImplementation(() => ({
    location: {
      protocol,
    },
  }));
}

describe("InsertAutofillContentService", function () {
  const domElementVisibilityService = new DomElementVisibilityService();
  const collectAutofillContentService = new CollectAutofillContentService(
    domElementVisibilityService
  );
  let insertAutofillContentService: InsertAutofillContentService;
  let fillScript: AutofillScript;

  beforeEach(() => {
    document.body.innerHTML = mockLoginForm;
    confirmSpy = jest.spyOn(window, "confirm");
    windowSpy = jest.spyOn(window, "window", "get");
    insertAutofillContentService = new InsertAutofillContentService(
      domElementVisibilityService,
      collectAutofillContentService
    );
    fillScript = {
      script: [
        ["click_on_opid", "username"],
        ["focus_by_opid", "username"],
        ["fill_by_opid", "username", "test"],
      ],
      properties: {
        delay_between_operations: 20,
      },
      metadata: {},
      autosubmit: null,
      savedUrls: ["https://bitwarden.com"],
      untrustedIframe: false,
      itemType: "login",
    };
  });

  afterEach(() => {
    windowSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  describe("fillForm", function () {
    it("returns early if the passed fill script does not have a script property", function () {
      fillScript.script = [];
      jest.spyOn(insertAutofillContentService as any, "fillingWithinSandboxedIframe");
      jest.spyOn(insertAutofillContentService as any, "userCancelledInsecureUrlAutofill");
      jest.spyOn(insertAutofillContentService as any, "userCancelledUntrustedIframeAutofill");
      jest.spyOn(insertAutofillContentService as any, "runFillScriptAction");

      insertAutofillContentService.fillForm(fillScript);

      expect(insertAutofillContentService["fillingWithinSandboxedIframe"]).not.toHaveBeenCalled();
      expect(
        insertAutofillContentService["userCancelledInsecureUrlAutofill"]
      ).not.toHaveBeenCalled();
      expect(
        insertAutofillContentService["userCancelledUntrustedIframeAutofill"]
      ).not.toHaveBeenCalled();
      expect(insertAutofillContentService["runFillScriptAction"]).not.toHaveBeenCalled();
    });

    it("returns early if the script is filling within a sand boxed iframe", function () {
      jest
        .spyOn(insertAutofillContentService as any, "fillingWithinSandboxedIframe")
        .mockReturnValue(true);
      jest.spyOn(insertAutofillContentService as any, "userCancelledInsecureUrlAutofill");
      jest.spyOn(insertAutofillContentService as any, "userCancelledUntrustedIframeAutofill");
      jest.spyOn(insertAutofillContentService as any, "runFillScriptAction");

      insertAutofillContentService.fillForm(fillScript);

      expect(insertAutofillContentService["fillingWithinSandboxedIframe"]).toHaveBeenCalled();
      expect(
        insertAutofillContentService["userCancelledInsecureUrlAutofill"]
      ).not.toHaveBeenCalled();
      expect(
        insertAutofillContentService["userCancelledUntrustedIframeAutofill"]
      ).not.toHaveBeenCalled();
      expect(insertAutofillContentService["runFillScriptAction"]).not.toHaveBeenCalled();
    });

    it("returns early if the autofill is occurring on an insecure url and the user cancels the autofill", function () {
      jest
        .spyOn(insertAutofillContentService as any, "fillingWithinSandboxedIframe")
        .mockReturnValue(false);
      jest
        .spyOn(insertAutofillContentService as any, "userCancelledInsecureUrlAutofill")
        .mockReturnValue(true);
      jest.spyOn(insertAutofillContentService as any, "userCancelledUntrustedIframeAutofill");
      jest.spyOn(insertAutofillContentService as any, "runFillScriptAction");

      insertAutofillContentService.fillForm(fillScript);

      expect(insertAutofillContentService["fillingWithinSandboxedIframe"]).toHaveBeenCalled();
      expect(insertAutofillContentService["userCancelledInsecureUrlAutofill"]).toHaveBeenCalled();
      expect(
        insertAutofillContentService["userCancelledUntrustedIframeAutofill"]
      ).not.toHaveBeenCalled();
      expect(insertAutofillContentService["runFillScriptAction"]).not.toHaveBeenCalled();
    });

    it("returns early if the iframe is untrusted and the user cancelled the autofill", function () {
      jest
        .spyOn(insertAutofillContentService as any, "fillingWithinSandboxedIframe")
        .mockReturnValue(false);
      jest
        .spyOn(insertAutofillContentService as any, "userCancelledInsecureUrlAutofill")
        .mockReturnValue(false);
      jest
        .spyOn(insertAutofillContentService as any, "userCancelledUntrustedIframeAutofill")
        .mockReturnValue(true);
      jest.spyOn(insertAutofillContentService as any, "runFillScriptAction");

      insertAutofillContentService.fillForm(fillScript);

      expect(insertAutofillContentService["fillingWithinSandboxedIframe"]).toHaveBeenCalled();
      expect(insertAutofillContentService["userCancelledInsecureUrlAutofill"]).toHaveBeenCalled();
      expect(
        insertAutofillContentService["userCancelledUntrustedIframeAutofill"]
      ).toHaveBeenCalled();
      expect(insertAutofillContentService["runFillScriptAction"]).not.toHaveBeenCalled();
    });

    it("runs the fill script action for all scripts found within the fill script", function () {
      jest
        .spyOn(insertAutofillContentService as any, "fillingWithinSandboxedIframe")
        .mockReturnValue(false);
      jest
        .spyOn(insertAutofillContentService as any, "userCancelledInsecureUrlAutofill")
        .mockReturnValue(false);
      jest
        .spyOn(insertAutofillContentService as any, "userCancelledUntrustedIframeAutofill")
        .mockReturnValue(false);
      jest.spyOn(insertAutofillContentService as any, "runFillScriptAction");

      insertAutofillContentService.fillForm(fillScript);

      expect(insertAutofillContentService["fillingWithinSandboxedIframe"]).toHaveBeenCalled();
      expect(insertAutofillContentService["userCancelledInsecureUrlAutofill"]).toHaveBeenCalled();
      expect(
        insertAutofillContentService["userCancelledUntrustedIframeAutofill"]
      ).toHaveBeenCalled();
      expect(insertAutofillContentService["runFillScriptAction"]).toHaveBeenCalledTimes(3);
      expect(insertAutofillContentService["runFillScriptAction"]).toHaveBeenNthCalledWith(
        1,
        fillScript.script[0],
        0,
        fillScript.script
      );
      expect(insertAutofillContentService["runFillScriptAction"]).toHaveBeenNthCalledWith(
        2,
        fillScript.script[1],
        1,
        fillScript.script
      );
      expect(insertAutofillContentService["runFillScriptAction"]).toHaveBeenNthCalledWith(
        3,
        fillScript.script[2],
        2,
        fillScript.script
      );
    });
  });

  describe("fillingWithinSandboxedIframe", function () {
    it("returns false if the `self.origin` value is not null", function () {
      const result = insertAutofillContentService["fillingWithinSandboxedIframe"]();

      expect(result).toBe(false);
      expect(self.origin).not.toBeNull();
    });
  });

  describe("userCancelledInsecureUrlAutofill", function () {
    beforeEach(() => {
      savedURLs = ["https://bitwarden.com"];
    });

    describe("returns false if Autofill occurring...", function () {
      it("when there are no saved URLs", function () {
        savedURLs = [];
        setMockWindowLocationProtocol("http:");

        const userCancelledInsecureUrlAutofill =
          insertAutofillContentService["userCancelledInsecureUrlAutofill"](savedURLs);

        expect(userCancelledInsecureUrlAutofill).toBe(false);

        savedURLs = null;

        const userCancelledInsecureUrlAutofill2 =
          insertAutofillContentService["userCancelledInsecureUrlAutofill"](savedURLs);

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(userCancelledInsecureUrlAutofill2).toBe(false);
      });

      it("on http page and saved URLs contain no https values", function () {
        savedURLs = ["http://bitwarden.com"];
        setMockWindowLocationProtocol("http:");

        const userCancelledInsecureUrlAutofill =
          insertAutofillContentService["userCancelledInsecureUrlAutofill"](savedURLs);

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(userCancelledInsecureUrlAutofill).toBe(false);
      });

      it("on https page with saved https URL", function () {
        setMockWindowLocationProtocol("https:");

        const userCancelledInsecureUrlAutofill =
          insertAutofillContentService["userCancelledInsecureUrlAutofill"](savedURLs);

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(userCancelledInsecureUrlAutofill).toBe(false);
      });

      it("on page with no password field", function () {
        setMockWindowLocationProtocol("https:");

        document.body.innerHTML = `
        <div id="root">
          <form>
            <input type="text" id="username" />
          </form>
        </div>
      `;

        const userCancelledInsecureUrlAutofill =
          insertAutofillContentService["userCancelledInsecureUrlAutofill"](savedURLs);

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(userCancelledInsecureUrlAutofill).toBe(false);
      });

      it("on http page with saved https URL and user approval", function () {
        setMockWindowLocationProtocol("http:");
        confirmSpy.mockImplementation(jest.fn(() => true));

        const userCancelledInsecureUrlAutofill =
          insertAutofillContentService["userCancelledInsecureUrlAutofill"](savedURLs);

        expect(confirmSpy).toHaveBeenCalled();
        expect(userCancelledInsecureUrlAutofill).toBe(false);
      });
    });

    it("returns true if Autofill occurring on http page with saved https URL and user disapproval", function () {
      setMockWindowLocationProtocol("http:");
      confirmSpy.mockImplementation(jest.fn(() => false));

      const userCancelledInsecureUrlAutofill =
        insertAutofillContentService["userCancelledInsecureUrlAutofill"](savedURLs);

      expect(confirmSpy).toHaveBeenCalled();
      expect(userCancelledInsecureUrlAutofill).toBe(true);
    });
  });

  describe("userCancelledUntrustedIframeAutofill", function () {
    it("returns false if Autofill occurring within a trusted iframe", function () {
      fillScript.untrustedIframe = false;

      const result =
        insertAutofillContentService["userCancelledUntrustedIframeAutofill"](fillScript);

      expect(result).toBe(false);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("returns false if Autofill occurring within an untrusted iframe and the user approves", function () {
      fillScript.untrustedIframe = true;
      confirmSpy.mockImplementation(jest.fn(() => true));

      const result =
        insertAutofillContentService["userCancelledUntrustedIframeAutofill"](fillScript);

      expect(result).toBe(false);
      expect(confirmSpy).toHaveBeenCalled();
    });

    it("returns true if Autofill occurring within an untrusted iframe and the user disapproves", function () {
      fillScript.untrustedIframe = true;
      confirmSpy.mockImplementation(jest.fn(() => false));

      const result =
        insertAutofillContentService["userCancelledUntrustedIframeAutofill"](fillScript);

      expect(result).toBe(true);
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe("runFillScriptAction", function () {
    beforeEach(function () {
      jest.useFakeTimers();
    });

    it("returns early if no opid is provided", function () {
      const action = "fill_by_opid";
      const opid = "";
      const value = "value";
      const scriptAction: FillScript = [action, opid, value];
      jest.spyOn(insertAutofillContentService["autofillInsertActions"], action);

      insertAutofillContentService["runFillScriptAction"](scriptAction, 0);
      jest.advanceTimersByTime(20);

      expect(insertAutofillContentService["autofillInsertActions"][action]).not.toHaveBeenCalled();
    });

    describe("given a valid fill script action and opid", function () {
      const fillScriptActions: FillScriptActions[] = [
        "fill_by_opid",
        "click_on_opid",
        "focus_by_opid",
      ];
      fillScriptActions.forEach((action) => {
        it(`triggers a ${action} action`, function () {
          const opid = "opid";
          const value = "value";
          const scriptAction: FillScript = [action, opid, value];
          jest.spyOn(insertAutofillContentService["autofillInsertActions"], action);

          insertAutofillContentService["runFillScriptAction"](scriptAction, 0);
          jest.advanceTimersByTime(20);

          expect(
            insertAutofillContentService["autofillInsertActions"][action]
          ).toHaveBeenCalledWith({
            opid,
            value,
          });
        });
      });
    });
  });

  describe("handleFillFieldByOpidAction", function () {
    it("finds the field element by opid and inserts the value into the field", function () {
      const opid = "__1";
      const value = "value";
      const textInput = document.querySelector('input[type="text"]') as FormElementWithAttribute;
      textInput.opid = opid;
      textInput.value = value;
      jest.spyOn(
        insertAutofillContentService["collectAutofillContentService"],
        "getAutofillFieldElementByOpid"
      );
      jest.spyOn(insertAutofillContentService as any, "insertValueIntoField");

      insertAutofillContentService["handleFillFieldByOpidAction"](opid, value);

      expect(
        insertAutofillContentService["collectAutofillContentService"].getAutofillFieldElementByOpid
      ).toHaveBeenCalledWith(opid);
      expect(insertAutofillContentService["insertValueIntoField"]).toHaveBeenCalledWith(
        textInput,
        value
      );
    });
  });

  describe("handleClickOnFieldByOpidAction", function () {
    it("clicks on the elements targeted by the passed opid", function () {
      const textInput = document.querySelector('input[type="text"]') as FormElementWithAttribute;
      textInput.opid = "__1";
      let clickEventCount = 0;
      const expectedClickEventCount = 1;
      const clickEventHandler: (handledEvent: Event) => void = (handledEvent) => {
        const eventTarget = handledEvent.target as HTMLInputElement;

        if (eventTarget.id === "username") {
          clickEventCount++;
        }
      };
      textInput.addEventListener("click", clickEventHandler);
      jest.spyOn(
        insertAutofillContentService["collectAutofillContentService"],
        "getAutofillFieldElementByOpid"
      );
      jest.spyOn(insertAutofillContentService as any, "triggerClickOnElement");

      insertAutofillContentService["handleClickOnFieldByOpidAction"]("__1");

      expect(
        insertAutofillContentService["collectAutofillContentService"].getAutofillFieldElementByOpid
      ).toBeCalledWith("__1");
      expect((insertAutofillContentService as any)["triggerClickOnElement"]).toHaveBeenCalledWith(
        textInput
      );
      expect(clickEventCount).toBe(expectedClickEventCount);

      textInput.removeEventListener("click", clickEventHandler);
    });

    it("should not trigger click when no suitable elements can be found", function () {
      const textInput = document.querySelector('input[type="text"]') as FormElementWithAttribute;
      let clickEventCount = 0;
      const expectedClickEventCount = 0;
      const clickEventHandler: (handledEvent: Event) => void = (handledEvent) => {
        const eventTarget = handledEvent.target as HTMLInputElement;

        if (eventTarget.id === "username") {
          clickEventCount++;
        }
      };
      textInput.addEventListener("click", clickEventHandler);

      insertAutofillContentService["handleClickOnFieldByOpidAction"]("__2");

      expect(clickEventCount).toEqual(expectedClickEventCount);

      textInput.removeEventListener("click", clickEventHandler);
    });
  });

  describe("handleFocusOnFieldByOpidAction", function () {
    it("simulates click and focus events on the element targeted by the passed opid", function () {
      const targetInput = document.querySelector('input[type="text"]') as FormElementWithAttribute;
      targetInput.opid = "__0";
      const elementEventCount: { [key: string]: number } = {
        ...initEventCount,
      };
      // Testing all the relevant events to ensure downstream side-effects are firing correctly
      const expectedElementEventCount: { [key: string]: number } = {
        ...initEventCount,
        click: 1,
        focus: 1,
        focusin: 1,
      };
      const eventHandlers: { [key: string]: EventListener } = {};
      eventsToTest.forEach((eventType) => {
        eventHandlers[eventType] = (handledEvent) => {
          elementEventCount[handledEvent.type]++;
        };
        targetInput.addEventListener(eventType, eventHandlers[eventType]);
      });
      jest.spyOn(
        insertAutofillContentService["collectAutofillContentService"],
        "getAutofillFieldElementByOpid"
      );
      jest.spyOn(
        insertAutofillContentService as any,
        "simulateUserMouseClickAndFocusEventInteractions"
      );

      insertAutofillContentService["handleFocusOnFieldByOpidAction"]("__0");

      expect(
        insertAutofillContentService["collectAutofillContentService"].getAutofillFieldElementByOpid
      ).toBeCalledWith("__0");
      expect(
        insertAutofillContentService["simulateUserMouseClickAndFocusEventInteractions"]
      ).toHaveBeenCalledWith(targetInput, true);
      expect(elementEventCount).toEqual(expectedElementEventCount);
    });
  });

  describe("insertValueIntoField", function () {
    it("returns early if an element is not provided", function () {
      const value = "test";
      const element: FormFieldElement | null = null;
      jest.spyOn(insertAutofillContentService as any, "handleInsertValueAndTriggerSimulatedEvents");

      insertAutofillContentService["insertValueIntoField"](element, value);

      expect(
        insertAutofillContentService["handleInsertValueAndTriggerSimulatedEvents"]
      ).not.toHaveBeenCalled();
    });

    it("returns early if a value is not provided", function () {
      const value = "";
      const element: FormFieldElement | null = document.querySelector('input[type="text"]');
      jest.spyOn(insertAutofillContentService as any, "handleInsertValueAndTriggerSimulatedEvents");

      insertAutofillContentService["insertValueIntoField"](element, value);

      expect(
        insertAutofillContentService["handleInsertValueAndTriggerSimulatedEvents"]
      ).not.toHaveBeenCalled();
    });

    it("will set the inner text of the element if a span element is passed", function () {
      document.body.innerHTML = `<span id="username"></span>`;
      const value = "test";
      const element = document.getElementById("username") as FormFieldElement;
      jest.spyOn(insertAutofillContentService as any, "handleInsertValueAndTriggerSimulatedEvents");

      insertAutofillContentService["insertValueIntoField"](element, value);

      expect(element.innerText).toBe(value);
      expect(
        insertAutofillContentService["handleInsertValueAndTriggerSimulatedEvents"]
      ).toHaveBeenCalledWith(element, expect.any(Function));
    });

    it("will set the `checked` attribute of any passed checkbox or radio elements", function () {
      document.body.innerHTML = `<input type="checkbox" id="checkbox" /><input type="radio" id="radio" />`;
      const checkboxElement = document.getElementById("checkbox") as HTMLInputElement;
      const radioElement = document.getElementById("radio") as HTMLInputElement;
      jest.spyOn(insertAutofillContentService as any, "handleInsertValueAndTriggerSimulatedEvents");

      const possibleValues = ["true", "y", "1", "yes", "✓"];
      possibleValues.forEach((value) => {
        insertAutofillContentService["insertValueIntoField"](checkboxElement, value);
        insertAutofillContentService["insertValueIntoField"](radioElement, value);

        expect(checkboxElement.checked).toBe(true);
        expect(radioElement.checked).toBe(true);
        expect(
          insertAutofillContentService["handleInsertValueAndTriggerSimulatedEvents"]
        ).toHaveBeenCalledWith(checkboxElement, expect.any(Function));
        expect(
          insertAutofillContentService["handleInsertValueAndTriggerSimulatedEvents"]
        ).toHaveBeenCalledWith(radioElement, expect.any(Function));

        checkboxElement.checked = false;
        radioElement.checked = false;
      });
    });

    it("will set the `value` attribute of any passed input or textarea elements", function () {
      document.body.innerHTML = `<input type="text" id="username" /><textarea id="bio"></textarea>`;
      const value1 = "test";
      const value2 = "test2";
      const textInputElement = document.getElementById("username") as HTMLInputElement;
      textInputElement.value = value1;
      const textareaElement = document.getElementById("bio") as HTMLTextAreaElement;
      textareaElement.value = value2;
      jest.spyOn(insertAutofillContentService as any, "handleInsertValueAndTriggerSimulatedEvents");

      insertAutofillContentService["insertValueIntoField"](textInputElement, value1);

      expect(textInputElement.value).toBe(value1);
      expect(
        insertAutofillContentService["handleInsertValueAndTriggerSimulatedEvents"]
      ).toHaveBeenCalledWith(textInputElement, expect.any(Function));

      insertAutofillContentService["insertValueIntoField"](textareaElement, value2);

      expect(textareaElement.value).toBe(value2);
      expect(
        insertAutofillContentService["handleInsertValueAndTriggerSimulatedEvents"]
      ).toHaveBeenCalledWith(textareaElement, expect.any(Function));
    });
  });

  describe("handleInsertValueAndTriggerSimulatedEvents", function () {
    it("triggers pre- and post-insert events on the element while filling the value into the element", function () {
      const value = "test";
      const element = document.querySelector('input[type="text"]') as FormFieldElement;
      jest.spyOn(insertAutofillContentService as any, "triggerPreInsertEventsOnElement");
      jest.spyOn(insertAutofillContentService as any, "triggerPostInsertEventsOnElement");
      jest.spyOn(insertAutofillContentService as any, "triggerFillAnimationOnElement");
      const valueChangeCallback = jest.fn(
        () => ((element as FillableFormFieldElement).value = value)
      );

      insertAutofillContentService["handleInsertValueAndTriggerSimulatedEvents"](
        element,
        valueChangeCallback
      );

      expect(insertAutofillContentService["triggerPreInsertEventsOnElement"]).toHaveBeenCalledWith(
        element
      );
      expect(valueChangeCallback).toHaveBeenCalled();
      expect(insertAutofillContentService["triggerPostInsertEventsOnElement"]).toHaveBeenCalledWith(
        element
      );
      expect(insertAutofillContentService["triggerFillAnimationOnElement"]).toHaveBeenCalledWith(
        element
      );
      expect((element as FillableFormFieldElement).value).toBe(value);
    });
  });

  describe("triggerPreInsertEventsOnElement", function () {
    it("triggers a simulated click and keyboard event on the element", function () {
      const initialElementValue = "test";
      document.body.innerHTML = `<input type="text" id="username" value="${initialElementValue}"/>`;
      const element = document.getElementById("username") as FillableFormFieldElement;
      jest.spyOn(
        insertAutofillContentService as any,
        "simulateUserMouseClickAndFocusEventInteractions"
      );
      jest.spyOn(insertAutofillContentService as any, "simulateUserKeyboardEventInteractions");

      insertAutofillContentService["triggerPreInsertEventsOnElement"](element);

      expect(
        insertAutofillContentService["simulateUserMouseClickAndFocusEventInteractions"]
      ).toHaveBeenCalledWith(element);
      expect(
        insertAutofillContentService["simulateUserKeyboardEventInteractions"]
      ).toHaveBeenCalledWith(element);
      expect(element.value).toBe(initialElementValue);
    });
  });

  describe("triggerPostInsertEventsOnElement", function () {
    it("triggers simulated event interactions and blurs the element after", function () {
      const elementValue = "test";
      document.body.innerHTML = `<input type="text" id="username" value="${elementValue}"/>`;
      const element = document.getElementById("username") as FillableFormFieldElement;
      jest.spyOn(element, "blur");
      jest.spyOn(insertAutofillContentService as any, "simulateUserKeyboardEventInteractions");
      jest.spyOn(insertAutofillContentService as any, "simulateInputElementChangedEvent");

      insertAutofillContentService["triggerPostInsertEventsOnElement"](element);

      expect(
        insertAutofillContentService["simulateUserKeyboardEventInteractions"]
      ).toHaveBeenCalledWith(element);
      expect(insertAutofillContentService["simulateInputElementChangedEvent"]).toHaveBeenCalledWith(
        element
      );
      expect(element.blur).toHaveBeenCalled();
      expect(element.value).toBe(elementValue);
    });
  });

  describe("triggerFillAnimationOnElement", function () {
    beforeEach(function () {
      jest.useFakeTimers();
      jest.clearAllTimers();
    });

    describe("will not trigger the animation when...", function () {
      it("the element is a non-hidden hidden input type", async function () {
        document.body.innerHTML = mockLoginForm + '<input type="hidden" />';
        const testElement = document.querySelector(
          'input[type="hidden"]'
        ) as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        await jest.advanceTimersByTime(200);

        expect(testElement.classList.add).not.toHaveBeenCalled();
        expect(testElement.classList.remove).not.toHaveBeenCalled();
      });

      it("the element is a non-hidden textarea", function () {
        document.body.innerHTML = mockLoginForm + "<textarea></textarea>";
        const testElement = document.querySelector("textarea") as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).not.toHaveBeenCalled();
        expect(testElement.classList.remove).not.toHaveBeenCalled();
      });

      it("the element is a unsupported tag", function () {
        document.body.innerHTML = mockLoginForm + '<div id="input-tag"></div>';
        const testElement = document.querySelector("#input-tag") as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).not.toHaveBeenCalled();
        expect(testElement.classList.remove).not.toHaveBeenCalled();
      });

      it("the element has a `visibility: hidden;` CSS rule applied to it", function () {
        const testElement = document.querySelector(
          'input[type="password"]'
        ) as FillableFormFieldElement;
        testElement.style.visibility = "hidden";
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).not.toHaveBeenCalled();
        expect(testElement.classList.remove).not.toHaveBeenCalled();
      });

      it("the element has a `display: none;` CSS rule applied to it", function () {
        const testElement = document.querySelector(
          'input[type="password"]'
        ) as FillableFormFieldElement;
        testElement.style.display = "none";
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).not.toHaveBeenCalled();
        expect(testElement.classList.remove).not.toHaveBeenCalled();
      });

      it("a parent of the element has an `opacity: 0;` CSS rule applied to it", function () {
        document.body.innerHTML =
          mockLoginForm + '<div style="opacity: 0;"><input type="email" /></div>';
        const testElement = document.querySelector(
          'input[type="email"]'
        ) as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).not.toHaveBeenCalled();
        expect(testElement.classList.remove).not.toHaveBeenCalled();
      });
    });

    describe("will trigger the animation when...", function () {
      it("the element is a non-hidden password field", function () {
        const testElement = document.querySelector(
          'input[type="password"]'
        ) as FillableFormFieldElement;
        jest.spyOn(
          insertAutofillContentService["domElementVisibilityService"],
          "isElementHiddenByCss"
        );
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(
          insertAutofillContentService["domElementVisibilityService"].isElementHiddenByCss
        ).toHaveBeenCalledWith(testElement);
        expect(testElement.classList.add).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
        expect(testElement.classList.remove).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
      });

      it("the element is a non-hidden email input", function () {
        document.body.innerHTML = mockLoginForm + '<input type="email" />';
        const testElement = document.querySelector(
          'input[type="email"]'
        ) as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
        expect(testElement.classList.remove).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
      });

      it("the element is a non-hidden text input", function () {
        document.body.innerHTML = mockLoginForm + '<input type="text" />';
        const testElement = document.querySelector(
          'input[type="text"]'
        ) as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
        expect(testElement.classList.remove).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
      });

      it("the element is a non-hidden number input", function () {
        document.body.innerHTML = mockLoginForm + '<input type="number" />';
        const testElement = document.querySelector(
          'input[type="number"]'
        ) as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
        expect(testElement.classList.remove).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
      });

      it("the element is a non-hidden tel input", function () {
        document.body.innerHTML = mockLoginForm + '<input type="tel" />';
        const testElement = document.querySelector('input[type="tel"]') as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
        expect(testElement.classList.remove).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
      });

      it("the element is a non-hidden url input", function () {
        document.body.innerHTML = mockLoginForm + '<input type="url" />';
        const testElement = document.querySelector('input[type="url"]') as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
        expect(testElement.classList.remove).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
      });

      it("the element is a non-hidden span", function () {
        document.body.innerHTML = mockLoginForm + '<span id="input-tag"></span>';
        const testElement = document.querySelector("#input-tag") as FillableFormFieldElement;
        jest.spyOn(testElement.classList, "add");
        jest.spyOn(testElement.classList, "remove");

        insertAutofillContentService["triggerFillAnimationOnElement"](testElement);
        jest.advanceTimersByTime(200);

        expect(testElement.classList.add).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
        expect(testElement.classList.remove).toHaveBeenCalledWith(
          "com-bitwarden-browser-animated-fill"
        );
      });
    });
  });

  describe("triggerClickOnElement", function () {
    it("will trigger a click event on the passed element", function () {
      const inputElement = document.querySelector('input[type="text"]') as HTMLElement;
      jest.spyOn(inputElement, "click");

      insertAutofillContentService["triggerClickOnElement"](inputElement);

      expect(inputElement.click).toHaveBeenCalled();
    });
  });

  describe("triggerFocusOnElement", function () {
    it("will trigger a focus event on the passed element and attempt to reset the value", function () {
      const value = "test";
      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
      inputElement.value = "test";
      jest.spyOn(inputElement, "focus");
      jest.spyOn(window, "String");

      insertAutofillContentService["triggerFocusOnElement"](inputElement, true);

      expect(window.String).toHaveBeenCalledWith(value);
      expect(inputElement.focus).toHaveBeenCalled();
      expect(inputElement.value).toEqual(value);
    });

    it("will not attempt to reset the value but will still focus the element", function () {
      const value = "test";
      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
      inputElement.value = "test";
      jest.spyOn(inputElement, "focus");
      jest.spyOn(window, "String");

      insertAutofillContentService["triggerFocusOnElement"](inputElement, false);

      expect(window.String).not.toHaveBeenCalledWith();
      expect(inputElement.focus).toHaveBeenCalled();
      expect(inputElement.value).toEqual(value);
    });
  });

  describe("simulateUserMouseClickAndFocusEventInteractions", function () {
    it("will trigger click and focus events on the passed element", function () {
      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
      jest.spyOn(insertAutofillContentService as any, "triggerClickOnElement");
      jest.spyOn(insertAutofillContentService as any, "triggerFocusOnElement");

      insertAutofillContentService["simulateUserMouseClickAndFocusEventInteractions"](inputElement);

      expect(insertAutofillContentService["triggerClickOnElement"]).toHaveBeenCalledWith(
        inputElement
      );
      expect(insertAutofillContentService["triggerFocusOnElement"]).toHaveBeenCalledWith(
        inputElement,
        false
      );
    });
  });

  describe("simulateUserKeyboardEventInteractions", function () {
    it("will trigger `keydown`, `keypress`, and `keyup` events on the passed element", function () {
      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
      jest.spyOn(inputElement, "dispatchEvent");

      insertAutofillContentService["simulateUserKeyboardEventInteractions"](inputElement);

      [EVENTS.KEYDOWN, EVENTS.KEYPRESS, EVENTS.KEYUP].forEach((eventName) => {
        expect(inputElement.dispatchEvent).toHaveBeenCalledWith(
          new KeyboardEvent(eventName, { bubbles: true })
        );
      });
    });
  });

  describe("simulateInputElementChangedEvent", function () {
    it("will trigger `input` and `change` events on the passed element", function () {
      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
      jest.spyOn(inputElement, "dispatchEvent");

      insertAutofillContentService["simulateInputElementChangedEvent"](inputElement);

      [EVENTS.INPUT, EVENTS.CHANGE].forEach((eventName) => {
        expect(inputElement.dispatchEvent).toHaveBeenCalledWith(
          new Event(eventName, { bubbles: true })
        );
      });
    });
  });
});
