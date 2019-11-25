import Store from "../store";
import { MutableState, Derived, StoreType, Owner } from "../../types";
import { STORE, OWNER, PATH, RAW, MUTABLE_STATE } from "../symbols";

interface MyStore extends StoreType {
  state: {
    users: { profile: { name: string; surname: string } }[];
    usersLength: Derived<MyStore, number>;
    userName: Derived<MyStore, number, string>;
    userProp: Derived<MyStore, number, string, string>;
  };
  libraries: {
    capitalize: (str: string) => string;
  };
}

let rawStore: MyStore;
let store: Store<MyStore>;
let state: MutableState<MyStore>;

beforeEach(() => {
  rawStore = {
    state: {
      users: [
        { profile: { name: "Jon", surname: "Snow" } },
        { profile: { name: "Jammie", surname: "Lannister" } }
      ],
      usersLength: ({ state }) => state.users.length,
      userName: ({ state }) => index => state.users[index].profile.name,
      userProp: ({ state, libraries }) => (index, prop) =>
        libraries.capitalize(state.users[index].profile[prop])
    },
    actions: {},
    libraries: {
      capitalize: str => str.toUpperCase()
    }
  };
  store = new Store(rawStore);
  state = store.createMutableState();
});

describe("mutableState", () => {
  it("should return a mutable state", () => {
    expect(state[MUTABLE_STATE]).toBe(true);
    expect(state).toBeInstanceOf(Proxy);
    expect(state.users[MUTABLE_STATE]).toBe(true);
    expect(state.users).toBeInstanceOf(Proxy);
    expect(state.users[0][MUTABLE_STATE]).toBe(true);
    expect(state.users[0]).toBeInstanceOf(Proxy);
    expect(state.users[0].profile[MUTABLE_STATE]).toBe(true);
    expect(state.users[0].profile).toBeInstanceOf(Proxy);
  });

  it("should return the own keys of the raw state", () => {
    expect(Object.keys(state)).toEqual([
      "users",
      "usersLength",
      "userName",
      "userProp"
    ]);
    expect(Object.keys(state.users[0].profile)).toBe(["name", "surname"]);
  });

  it("should store the path of each part of the state", () => {
    expect(state[PATH]).toBe("state");
    expect(state.users[PATH]).toBe("state.users");
    expect(state.users[0][PATH]).toBe("state.users.0");
    expect(state.users[0].profile[PATH]).toBe("state.users.0.profile");
  });

  it("should store access to the raw state to each part of the observable state", () => {
    expect(state[RAW]).toBe(rawStore.state);
    expect(state.users[RAW]).toBe(rawStore.state.users);
    expect(state.users[0][RAW]).toBe(rawStore.state.users[0]);
    expect(state.users[0].profile[RAW]).toBe(rawStore.state.users[0].profile);
  });

  it("should store access to the store instance", () => {
    expect(state[STORE]).toBe(store);
    expect(state[STORE]).toBe(store);
    expect(state.users[STORE]).toBe(store);
    expect(state.users[STORE]).toBe(store);
    expect(state.users[0][STORE]).toBe(store);
    expect(state.users[0][STORE]).toBe(store);
    expect(state.users[0].profile[STORE]).toBe(store);
    expect(state.users[0].profile[STORE]).toBe(store);
  });

  it("should be able to mutate state", () => {
    const newUser = { profile: { name: "Daenerys", surname: "Targeryan" } };
    state.users[2] = newUser;
    expect(rawStore.state.users[2]).toBe(newUser);
    expect(state.users[2]).toEqual(newUser);
  });

  it("should change the path when objects are swapped", () => {
    const user0 = state.users[0];
    state.users[0] = state.users[1];
    state.users[1] = user0;
    expect(state.users[0][PATH]).toBe("state.users.0");
    expect(state.users[0].profile[PATH]).toBe("state.users.0.profile");
    expect(state.users[1][PATH]).toBe("state.users.1");
    expect(state.users[1].profile[PATH]).toBe("state.users.1.profile");
  });

  it("should change the raw state when objects are swapped", () => {
    const user0 = state.users[0];
    state.users[0] = state.users[1];
    state.users[1] = user0;
    expect(state.users[0][RAW]).toBe(rawStore.state.users[0]);
    expect(state.users[0].profile[RAW]).toBe(rawStore.state.users[0].profile);
    expect(state.users[1][RAW]).toBe(rawStore.state.users[1]);
    expect(state.users[1].profile[RAW]).toBe(rawStore.state.users[1].profile);
  });

  it("should leave the raw state as raw", () => {
    state.users[2] = { profile: { name: "Daenerys", surname: "Targeryan" } };
    expect(rawStore.state.users[2][MUTABLE_STATE]).toBe(undefined);
    expect(state.users[2][MUTABLE_STATE]).toBe(true);
    expect(rawStore.state.users[2][MUTABLE_STATE]).toBe(undefined);
  });

  it("should run the derived state functions using the root store as argument", () => {
    expect(state.usersLength).toBe(2);
    expect(state.userName(0)).toBe("Jon");
    expect(state.userProp(0, "surname")).toBe("SNOW");
  });

  it("should return the primitive values of the raw state", () => {
    expect(state.users[0].profile.name).toBe("Jon");
    expect(state.users[0].profile.surname).toBe("Snow");
  });

  it("should return the correct primitives when objects are swapped", () => {
    const jon = state.users[0];
    state.users[0] = state.users[1];
    state.users[1] = jon;
    expect(state.users[0].profile.name).toBe("Jammie");
    expect(state.users[0].profile.surname).toBe("Lannister");
    expect(state.users[1].profile.name).toBe("Jon");
    expect(state.users[1].profile.surname).toBe("Snow");
  });
});

describe("mutableState Owner", () => {
  it("should return different observable states and store different owner in development", () => {
    const store1 = new Store(rawStore, { mode: "development" });
    const store2 = new Store(rawStore, { mode: "development" });
    const owner1: Owner = { type: "debug", name: "owner1" };
    const owner2: Owner = { type: "debug", name: "owner2" };
    const state1 = store1.createMutableState(owner1);
    const state2 = store2.createMutableState(owner2);
    expect(state1[OWNER]).toBe(owner1);
    expect(state1.users[OWNER]).toBe(owner1);
    expect(state1.users[0][OWNER]).toBe(owner1);
    expect(state1.users[0].profile[OWNER]).toBe(owner1);
    expect(state2[OWNER]).toBe(owner2);
    expect(state2.users[OWNER]).toBe(owner2);
    expect(state2.users[0][OWNER]).toBe(owner2);
    expect(state2.users[0].profile[OWNER]).toBe(owner2);
    expect(state1).not.toBe(state2);
  });

  it("should return the same observable states without owner information in production", () => {
    const store1 = new Store(rawStore, { mode: "production" });
    const store2 = new Store(rawStore, { mode: "production" });
    const state1 = store1.createMutableState({
      type: "debug",
      name: "owner1"
    });
    const state2 = store2.createMutableState({
      type: "debug",
      name: "owner2"
    });
    expect(state1[OWNER]).toBe(null);
    expect(state1.users[OWNER]).toBe(null);
    expect(state1.users[0][OWNER]).toBe(null);
    expect(state1.users[0].profile[OWNER]).toBe(null);
    expect(state2[OWNER]).toBe(null);
    expect(state2.users[OWNER]).toBe(null);
    expect(state2.users[0][OWNER]).toBe(null);
    expect(state2.users[0].profile[OWNER]).toBe(null);
    expect(state1).toBe(state2);
  });
});