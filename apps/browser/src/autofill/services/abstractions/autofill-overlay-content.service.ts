import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";

import {
  FocusedFieldData,
  OverlayAddNewItemMessage,
  SubFrameOffsetData,
} from "../../background/abstractions/overlay.background";
import { AutofillExtensionMessageParam } from "../../content/abstractions/autofill-init";
import { AutofillOverlayElementType } from "../../enums/autofill-overlay.enum";
import AutofillField from "../../models/autofill-field";
import AutofillPageDetails from "../../models/autofill-page-details";
import { ElementWithOpId, FormFieldElement } from "../../types";

export type OpenAutofillInlineMenuOptions = {
  isFocusingFieldElement?: boolean;
  isOpeningFullInlineMenu?: boolean;
  authStatus?: AuthenticationStatus;
};

export type SubFrameDataFromWindowMessage = SubFrameOffsetData & {
  subFrameDepth: number;
};

export type AutofillOverlayContentExtensionMessageHandlers = {
  [key: string]: CallableFunction;
  openAutofillInlineMenu: ({ message }: AutofillExtensionMessageParam) => void;
  addNewVaultItemFromOverlay: () => void;
  blurMostRecentlyFocusedField: () => void;
  unsetMostRecentlyFocusedField: () => void;
  checkIsMostRecentlyFocusedFieldWithinViewport: () => Promise<boolean>;
  bgUnlockPopoutOpened: () => void;
  bgVaultItemRepromptPopoutOpened: () => void;
  redirectAutofillInlineMenuFocusOut: ({ message }: AutofillExtensionMessageParam) => void;
  updateAutofillInlineMenuVisibility: ({ message }: AutofillExtensionMessageParam) => void;
  getSubFrameOffsets: ({ message }: AutofillExtensionMessageParam) => Promise<SubFrameOffsetData>;
  getSubFrameOffsetsFromWindowMessage: ({ message }: AutofillExtensionMessageParam) => void;
  checkMostRecentlyFocusedFieldHasValue: () => boolean;
  setupRebuildSubFrameOffsetsListeners: () => void;
  destroyAutofillInlineMenuListeners: () => void;
};

export type AutofillOverlayContentExtensionMessage = {
  command: string;
  overlayElement?: AutofillOverlayElementType;
  focusedFieldData?: FocusedFieldData;
  isFieldCurrentlyFocused?: boolean;
  forceCloseInlineMenu?: boolean;
  subFrameData?: SubFrameOffsetData;
} & OverlayAddNewItemMessage;

export interface AutofillOverlayContentService {
  pageDetailsUpdateRequired: boolean;
  messageHandlers: AutofillOverlayContentExtensionMessageHandlers;
  init(): void;
  setupInlineMenu(
    autofillFieldElement: ElementWithOpId<FormFieldElement>,
    autofillFieldData: AutofillField,
    pageDetails: AutofillPageDetails,
  ): Promise<void>;
  blurMostRecentlyFocusedField(isClosingInlineMenu?: boolean): void;
  destroy(): void;
}
