const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ALICE_UID = "alice_123";
const BOB_UID = "bob_456";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085").split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

function validSupplementPayload(userId, now) {
  return {
    userId: userId,
    name: "D3 + K2 Vitamini",
    dosage: "1000 IU",
    category: "Vitamin",
    timeOfDay: "Sabah",
    takenToday: false,
    stockCount: 30,
    notes: "Kahvaltıdan sonra",
    createdAt: now,
    updatedAt: now,
  };
}

function validVitalLogPayload(userId, now) {
  return {
    userId: userId,
    type: "Tansiyon",
    title: "Sabah Tansiyon Ölçümü",
    primaryValue: 120,
    secondaryValue: 80,
    unit: "mmHg",
    note: "Normal",
    createdAt: now,
    updatedAt: now,
  };
}

test("Unauthenticated user: cannot read supplements or vital_logs", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(
    unauthDb.collection("users").doc(ALICE_UID).collection("supplements").get()
  );
  await assertFails(
    unauthDb.collection("users").doc(ALICE_UID).collection("vital_logs").get()
  );
});

test("Authenticated user: can create and read own supplement", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date();
  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("supplements")
      .doc("supp_1")
      .set(validSupplementPayload(ALICE_UID, now))
  );
  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("supplements")
      .where("userId", "==", ALICE_UID)
      .get()
  );
});

test("Authenticated user: cannot read or write another user's supplement", async () => {
  const now = new Date();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .collection("users")
      .doc(BOB_UID)
      .collection("supplements")
      .doc("bob_supp")
      .set(validSupplementPayload(BOB_UID, now));
  });

  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  await assertFails(
    aliceDb
      .collection("users")
      .doc(BOB_UID)
      .collection("supplements")
      .doc("bob_supp")
      .get()
  );
  await assertFails(
    aliceDb
      .collection("users")
      .doc(BOB_UID)
      .collection("supplements")
      .doc("bob_supp_2")
      .set(validSupplementPayload(BOB_UID, now))
  );
});

test("Shadow field injection and invalid enum rejected on supplement create", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date();
  await assertFails(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("supplements")
      .doc("supp_shadow")
      .set({
        ...validSupplementPayload(ALICE_UID, now),
        isAdmin: true,
      })
  );
  await assertFails(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("supplements")
      .doc("supp_bad_enum")
      .set({
        ...validSupplementPayload(ALICE_UID, now),
        category: "InvalidCategory",
      })
  );
});

test("Authenticated user: can create, update, and query own vital_logs", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date();
  const docRef = aliceDb
    .collection("users")
    .doc(ALICE_UID)
    .collection("vital_logs")
    .doc("log_1");

  await assertSucceeds(docRef.set(validVitalLogPayload(ALICE_UID, now)));
  await assertSucceeds(
    docRef.update({
      primaryValue: 118,
      updatedAt: new Date(),
    })
  );
  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("vital_logs")
      .where("userId", "==", ALICE_UID)
      .get()
  );
});

test("Authenticated user: can create, update, and read own portal_state while cross-user and shadow fields fail", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  const now = new Date();
  const stateDocRef = aliceDb
    .collection("users")
    .doc(ALICE_UID)
    .collection("portal_state")
    .doc("main");

  await assertSucceeds(
    stateDocRef.set({
      userId: ALICE_UID,
      displayName: "Dr. Ayşe Kaya",
      email: "ayse@vitatakip.com",
      payloadJson: JSON.stringify({ app: "VitaTakip", version: "9.4.0" }),
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(stateDocRef.get());

  await assertSucceeds(
    stateDocRef.update({
      payloadJson: JSON.stringify({ app: "VitaTakip", version: "9.4.0", updated: true }),
      updatedAt: new Date(),
    })
  );

  // Cross-user read & write must fail
  await assertFails(
    bobDb.collection("users").doc(ALICE_UID).collection("portal_state").doc("main").get()
  );
  await assertFails(
    unauthDb.collection("users").doc(ALICE_UID).collection("portal_state").doc("main").get()
  );

  // Shadow field injection must fail
  await assertFails(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("portal_state")
      .doc("shadow")
      .set({
        userId: ALICE_UID,
        displayName: "Dr. Ayşe Kaya",
        email: "ayse@vitatakip.com",
        payloadJson: "{}",
        isAdmin: true,
        createdAt: now,
        updatedAt: now,
      })
  );
});

