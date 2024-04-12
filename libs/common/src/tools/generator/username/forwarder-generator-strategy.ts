import { Observable, map, pipe } from "rxjs";

import { PolicyType } from "../../../admin-console/enums";
import { CryptoService } from "../../../platform/abstractions/crypto.service";
import { EncryptService } from "../../../platform/abstractions/encrypt.service";
import { SingleUserState, StateProvider, UserKeyDefinition } from "../../../platform/state";
import { UserId } from "../../../types/guid";
import { GeneratorStrategy } from "../abstractions";
import { DefaultPolicyEvaluator } from "../default-policy-evaluator";
import { NoPolicy } from "../no-policy";
import { BufferedKeyDefinition } from "../state/buffered-key-definition";
import { BufferedState } from "../state/buffered-state";
import { PaddedDataPacker } from "../state/padded-data-packer";
import { SecretClassifier } from "../state/secret-classifier";
import { SecretKeyDefinition } from "../state/secret-key-definition";
import { SecretState } from "../state/secret-state";
import { UserKeyEncryptor } from "../state/user-key-encryptor";

import { ApiOptions } from "./options/forwarder-options";

const ONE_MINUTE = 60 * 1000;
const OPTIONS_FRAME_SIZE = 512;

/** An email forwarding service configurable through an API. */
export abstract class ForwarderGeneratorStrategy<
  Options extends ApiOptions,
> extends GeneratorStrategy<Options, NoPolicy> {
  /** Initializes the generator strategy
   *  @param encryptService protects sensitive forwarder options
   *  @param keyService looks up the user key when protecting data.
   *  @param stateProvider creates the durable state for options storage
   */
  constructor(
    private readonly encryptService: EncryptService,
    private readonly keyService: CryptoService,
    private stateProvider: StateProvider,
  ) {
    super();
    // Uses password generator since there aren't policies
    // specific to usernames.
    this.policy = PolicyType.PasswordGenerator;

    this.cache_ms = ONE_MINUTE;
  }

  private durableStates = new Map<UserId, SingleUserState<Options>>();

  /** {@link GeneratorStrategy.durableState} */
  durableState = (userId: UserId) => {
    let state = this.durableStates.get(userId);

    if (!state) {
      state = this.createState(userId);

      this.durableStates.set(userId, state);
    }

    return state;
  };

  private createState(userId: UserId): SingleUserState<Options> {
    // construct the encryptor
    const packer = new PaddedDataPacker(OPTIONS_FRAME_SIZE);
    const encryptor = new UserKeyEncryptor(this.encryptService, this.keyService, packer);

    // always exclude request properties
    const classifier = SecretClassifier.allSecret<Options>().exclude("website");

    // Derive the secret key definition
    const key = SecretKeyDefinition.value(this.key.stateDefinition, this.key.key, classifier, {
      deserializer: (d) => this.key.deserializer(d),
      cleanupDelayMs: this.key.cleanupDelayMs,
      clearOn: this.key.clearOn,
    });

    // the type parameter is explicit because type inference fails for `Omit<Options, "website">`
    const secretState = SecretState.from<
      Options,
      void,
      Options,
      Record<keyof Options, never>,
      Omit<Options, "website">
    >(userId, key, this.stateProvider, encryptor);

    // rollover should occur once the user key is available for decryption
    const canDecrypt$ = this.keyService
      .getInMemoryUserKeyFor$(userId)
      .pipe(map((key) => key !== null));
    const rolloverState = new BufferedState(
      this.stateProvider,
      this.rolloverKey,
      secretState,
      canDecrypt$,
    );

    return rolloverState;
  }

  /** Gets the default options. */
  abstract defaults$: (userId: UserId) => Observable<Options>;

  /** Determine where forwarder configuration is stored  */
  protected abstract readonly key: UserKeyDefinition<Options>;

  /** Determine where forwarder rollover configuration is stored  */
  protected abstract readonly rolloverKey: BufferedKeyDefinition<Options, Options>;

  /** {@link GeneratorStrategy.toEvaluator} */
  toEvaluator = () => {
    return pipe(map((_) => new DefaultPolicyEvaluator<Options>()));
  };
}
