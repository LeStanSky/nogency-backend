import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/client.js';

/**
 * E2E test: simulates the full frontend onboarding flow.
 * Sends data exactly as the frontend does after field mapping.
 *
 * Flow: register → owner profile → property basics → amenities → utilities → verify
 */
describe('Onboarding E2E Flow', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let propertyId: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();

    // Clean up
    await prisma.propertyPhoto.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.ownerProfile.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.user.deleteMany({});

    const timestamp = Date.now();

    // Register owner
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `onboarding-e2e-${timestamp}@example.com`,
        password: 'SecurePass123!',
        phone: `+3460000${timestamp.toString().slice(-4)}`,
        role: 'OWNER',
      },
    });
    expect(registerRes.statusCode).toBe(201);
    ownerToken = JSON.parse(registerRes.body).token;

    // Create owner profile (frontend step: name page)
    const profileRes = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/owner',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        firstName: 'Carlos',
        lastName: 'García',
        documentType: 'DNI',
        documentNumber: `E2E${timestamp.toString().slice(-5)}`,
        isCompany: false,
      },
    });
    expect(profileRes.statusCode).toBe(201);
  });

  afterAll(async () => {
    await prisma.propertyPhoto.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.ownerProfile.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
    await prisma.$disconnect();
  });

  // =========================================================================
  // Step 1: Property Basics (property-basics/page.tsx)
  // =========================================================================
  it('Step 1: should create property with onboarding basics', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/properties',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        // Frontend sends: address: { street: store.address, city: "", postalCode: "" }
        address: { street: 'Calle Gran Via 42, Madrid', city: '', postalCode: '' },
        addressRaw: 'Calle Gran Via 42, Madrid',
        // Frontend sends: propertyType: data.propertyType.toUpperCase()
        propertyType: 'APARTMENT',
        // Frontend sends: totalArea: parseInt(store.area, 10) || 0
        totalArea: 85,
        // Frontend sends: roomCount: store.bedrooms
        roomCount: 3,
        // Frontend sends: floor: parseInt(data.floor, 10) || 0
        floor: 4,
        // Frontend sends: hasElevator: data.hasElevator ?? false
        hasElevator: true,
        // Frontend sends: outdoorFeatures: data.outdoor
        outdoorFeatures: ['balcony', 'terrace'],
        // Frontend sends: data.overallCondition.toUpperCase().replace(/ /g, "_")
        overallCondition: 'GOOD',
        // Frontend sends: parseInt(data.buildingYear, 10)
        buildingYear: 2015,
        // Frontend sends: data.energyClass || undefined
        energyClass: 'B',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    // Frontend reads: propertyResponse.id
    expect(body.id).toBeDefined();
    propertyId = body.id;

    // Verify all fields persisted
    expect(body.addressRaw).toBe('Calle Gran Via 42, Madrid');
    expect(body.propertyType).toBe('APARTMENT');
    expect(Number(body.totalArea)).toBe(85);
    expect(body.roomCount).toBe(3);
    expect(body.floor).toBe(4);
    expect(body.hasElevator).toBe(true);
    expect(body.outdoorFeatures).toEqual(['balcony', 'terrace']);
    expect(body.overallCondition).toBe('GOOD');
    expect(body.buildingYear).toBe(2015);
    expect(body.energyClass).toBe('B');
  });

  // =========================================================================
  // Step 2: Available Amenities (available-amenities/page.tsx)
  // =========================================================================
  it('Step 2: should update property with amenities', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/properties/${propertyId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        // Frontend sends: kitchenAppliances: data.kitchen
        kitchenAppliances: [
          'fridge',
          'stove_electric',
          'oven_electric',
          'dishwasher',
          'microwave_oven',
        ],
        // Frontend sends: washingFacilities: data.washing
        washingFacilities: ['washing_machine', 'tumble_dryer'],
        // Frontend sends: bathroomFeatures: data.bathroom
        bathroomFeatures: ['shower', 'bathtub'],
        // Frontend sends: heatingType: data.heatingSystem.toUpperCase()
        heatingType: 'CENTRAL',
        // Frontend sends: hotWaterSystems: data.hotWater
        hotWaterSystems: ['gas_boiler'],
        // Frontend sends: airConditioningTypes: data.airConditioning
        airConditioningTypes: ['split_units'],
        // Frontend sends: otherAmenities: data.otherAmenities
        otherAmenities: ['storage_room', 'burglar_alarm'],
        // Frontend sends: parkingOptions: data.parking
        parkingOptions: ['parking_included'],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.kitchenAppliances).toEqual([
      'fridge',
      'stove_electric',
      'oven_electric',
      'dishwasher',
      'microwave_oven',
    ]);
    expect(body.washingFacilities).toEqual(['washing_machine', 'tumble_dryer']);
    expect(body.bathroomFeatures).toEqual(['shower', 'bathtub']);
    expect(body.heatingType).toBe('CENTRAL');
    expect(body.hotWaterSystems).toEqual(['gas_boiler']);
    expect(body.airConditioningTypes).toEqual(['split_units']);
    expect(body.otherAmenities).toEqual(['storage_room', 'burglar_alarm']);
    expect(body.parkingOptions).toEqual(['parking_included']);
  });

  // =========================================================================
  // Step 3: Utility & Rent Conditions (utility-conditions/page.tsx)
  // =========================================================================
  it('Step 3: should update property with utilities and tenant rules', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/properties/${propertyId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        electricityIncluded: true,
        waterIncluded: true,
        gasIncluded: false,
        // Frontend sends: data.petsAllowed.toUpperCase()
        petsAllowed: 'NEGOTIABLE',
        kidsAllowed: 'YES',
        smokingAllowed: 'NO',
        maxTenants: 4,
        moveInOption: 'choose_date',
        moveInDate: '2026-05-01',
        moveOutOption: 'until_further_notice',
        moveOutDate: '',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.electricityIncluded).toBe(true);
    expect(body.waterIncluded).toBe(true);
    expect(body.gasIncluded).toBe(false);
    expect(body.petsAllowed).toBe('NEGOTIABLE');
    expect(body.kidsAllowed).toBe('YES');
    expect(body.smokingAllowed).toBe('NO');
    expect(body.maxTenants).toBe(4);
    expect(body.moveInOption).toBe('choose_date');
    expect(body.moveOutOption).toBe('until_further_notice');
  });

  // =========================================================================
  // Step 4: Verify full property (GET after all steps)
  // =========================================================================
  it('Step 4: should return complete property with all onboarding data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/properties/${propertyId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(response.statusCode).toBe(200);
    const p = JSON.parse(response.body);

    // Step 1 fields
    expect(p.addressRaw).toBe('Calle Gran Via 42, Madrid');
    expect(p.propertyType).toBe('APARTMENT');
    expect(Number(p.totalArea)).toBe(85);
    expect(p.roomCount).toBe(3);
    expect(p.floor).toBe(4);
    expect(p.hasElevator).toBe(true);
    expect(p.outdoorFeatures).toEqual(['balcony', 'terrace']);
    expect(p.overallCondition).toBe('GOOD');
    expect(p.buildingYear).toBe(2015);
    expect(p.energyClass).toBe('B');

    // Step 2 fields
    expect(p.kitchenAppliances).toEqual([
      'fridge',
      'stove_electric',
      'oven_electric',
      'dishwasher',
      'microwave_oven',
    ]);
    expect(p.washingFacilities).toEqual(['washing_machine', 'tumble_dryer']);
    expect(p.bathroomFeatures).toEqual(['shower', 'bathtub']);
    expect(p.heatingType).toBe('CENTRAL');
    expect(p.hotWaterSystems).toEqual(['gas_boiler']);
    expect(p.airConditioningTypes).toEqual(['split_units']);
    expect(p.otherAmenities).toEqual(['storage_room', 'burglar_alarm']);
    expect(p.parkingOptions).toEqual(['parking_included']);

    // Step 3 fields
    expect(p.electricityIncluded).toBe(true);
    expect(p.waterIncluded).toBe(true);
    expect(p.gasIncluded).toBe(false);
    expect(p.petsAllowed).toBe('NEGOTIABLE');
    expect(p.kidsAllowed).toBe('YES');
    expect(p.smokingAllowed).toBe('NO');
    expect(p.maxTenants).toBe(4);
    expect(p.moveInOption).toBe('choose_date');
    expect(p.moveOutOption).toBe('until_further_notice');
  });

  // =========================================================================
  // Extended PropertyType values
  // =========================================================================
  it('should accept new property types (PENTHOUSE, DUPLEX, LOFT)', async () => {
    for (const type of ['PENTHOUSE', 'DUPLEX', 'LOFT', 'OTHER']) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          address: { street: 'Test', city: 'Test', postalCode: '00000' },
          propertyType: type,
          totalArea: 50,
          roomCount: 1,
        },
      });

      expect(response.statusCode, `Failed for type ${type}`).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.propertyType).toBe(type);
    }
  });

  // =========================================================================
  // HeatingType INDIVIDUAL
  // =========================================================================
  it('should accept INDIVIDUAL heating type', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/properties/${propertyId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        heatingType: 'INDIVIDUAL',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).heatingType).toBe('INDIVIDUAL');
  });

  // =========================================================================
  // Validation: invalid enum values
  // =========================================================================
  it('should reject invalid overallCondition', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/properties',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        address: { street: 'Test', city: 'Test', postalCode: '00000' },
        propertyType: 'APARTMENT',
        totalArea: 50,
        roomCount: 1,
        overallCondition: 'TERRIBLE',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject invalid petsAllowed value', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/properties/${propertyId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        petsAllowed: 'MAYBE',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject invalid energyClass value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/properties',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        address: { street: 'Test', city: 'Test', postalCode: '00000' },
        propertyType: 'APARTMENT',
        totalArea: 50,
        roomCount: 1,
        energyClass: 'Z',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
