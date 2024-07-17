import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

import { PasswordRepromptService } from "../../../services/password-reprompt.service";
import { CipherFormContainer } from "../../cipher-form-container";
import { CustomFieldsComponent } from "../custom-fields/custom-fields.component";

import { AdditionalOptionsSectionComponent } from "./additional-options-section.component";

@Component({
  standalone: true,
  selector: "vault-custom-fields",
  template: "",
})
class MockCustomFieldsComponent {}

describe("AdditionalOptionsSectionComponent", () => {
  let component: AdditionalOptionsSectionComponent;
  let fixture: ComponentFixture<AdditionalOptionsSectionComponent>;
  let cipherFormProvider: MockProxy<CipherFormContainer>;
  let passwordRepromptService: MockProxy<PasswordRepromptService>;
  let passwordRepromptEnabled$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    cipherFormProvider = mock<CipherFormContainer>();

    passwordRepromptService = mock<PasswordRepromptService>();
    passwordRepromptEnabled$ = new BehaviorSubject(true);
    passwordRepromptService.enabled$ = passwordRepromptEnabled$;

    await TestBed.configureTestingModule({
      imports: [AdditionalOptionsSectionComponent],
      providers: [
        { provide: CipherFormContainer, useValue: cipherFormProvider },
        { provide: PasswordRepromptService, useValue: passwordRepromptService },
        { provide: I18nService, useValue: mock<I18nService>() },
      ],
    })
      .overrideComponent(AdditionalOptionsSectionComponent, {
        remove: {
          imports: [CustomFieldsComponent],
        },
        add: {
          imports: [MockCustomFieldsComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AdditionalOptionsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("registers 'additionalOptionsForm' form with CipherFormContainer", () => {
    expect(cipherFormProvider.registerChildForm).toHaveBeenCalledWith(
      "additionalOptions",
      component.additionalOptionsForm,
    );
  });

  it("patches 'additionalOptionsForm' changes to CipherFormContainer", () => {
    component.additionalOptionsForm.patchValue({
      notes: "new notes",
      reprompt: true,
    });

    expect(cipherFormProvider.patchCipher).toHaveBeenCalledWith({
      notes: "new notes",
      reprompt: 1,
    });
  });

  it("disables 'additionalOptionsForm' when in partial-edit mode", () => {
    cipherFormProvider.config.mode = "partial-edit";

    component.ngOnInit();

    expect(component.additionalOptionsForm.disabled).toBe(true);
  });

  it("initializes 'additionalOptionsForm' with original cipher view values", () => {
    (cipherFormProvider.originalCipherView as any) = {
      notes: "original notes",
      reprompt: 1,
    } as CipherView;

    component.ngOnInit();

    expect(component.additionalOptionsForm.value).toEqual({
      notes: "original notes",
      reprompt: true,
    });
  });

  it("hides password reprompt checkbox when disabled", () => {
    passwordRepromptEnabled$.next(true);
    fixture.detectChanges();

    let checkbox = fixture.nativeElement.querySelector("input[formControlName='reprompt']");
    expect(checkbox).not.toBeNull();

    passwordRepromptEnabled$.next(false);
    fixture.detectChanges();

    checkbox = fixture.nativeElement.querySelector("input[formControlName='reprompt']");
    expect(checkbox).toBeNull();
  });
});
