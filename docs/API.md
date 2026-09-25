# CargoFlow REST & WebSocket API Reference 📡

## Base URL
- **Localhost REST**: `http://localhost:3001/api`
- **Localhost WebSocket**: `http://localhost:3001/ws`

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Create a new company organization and initial Org Admin user.
```json
{
  "email": "admin@logistics.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "organizationName": "Acme Logistics Inc."
}
```
**Response (201)**:
```json
{
  "accessToken": "eyJhbGciOi...",
  "expiresIn": 900
}
```

### `POST /api/auth/login`
Authenticate with email and password. Sets HTTP-only refresh cookie.
```json
{
  "email": "admin@logistics.com",
  "password": "SecurePassword123!"
}
```

### `GET /api/auth/me`
Returns current user's profile and organization ID.

---

## 2. Vehicle Management (`/api/vehicles`)

### `GET /api/vehicles`
List all active fleet vehicles/trailers belonging to the user's organization.

### `POST /api/vehicles`
Register a new vehicle with exact interior dimensions.
```json
{
  "name": "Dry Van 53ft",
  "type": "SEMI_TRAILER",
  "interiorLength": 16000,
  "interiorWidth": 2500,
  "interiorHeight": 2800,
  "maxPayloadKg": 25000,
  "doorWidth": 2450,
  "doorHeight": 2700,
  "description": "Standard 53-foot North American dry van"
}
```

---

## 3. Package Catalog (`/api/package-definitions`)

### `GET /api/package-definitions?search=pallet`
Search cargo item catalog.

### `POST /api/package-definitions`
Create reusable cargo SKU with physical and handling constraints.
```json
{
  "name": "Standard Euro Pallet",
  "sku": "SKU-EUR-01",
  "length": 1200,
  "width": 800,
  "height": 144,
  "weightKg": 25,
  "isFragile": false,
  "isStackable": true,
  "requiresUprightOrientation": true,
  "allowedRotations": [0, 2]
}
```

---

## 4. Load Planning (`/api/loads`)

### `GET /api/loads`
List loads for the organization.

### `POST /api/loads`
Create a new shipment load.
```json
{
  "vehicleId": "uuid-vehicle",
  "origin": "Dallas Depot",
  "destination": "Houston Terminal",
  "notes": "Express cross-dock delivery"
}
```

### `POST /api/loads/:id/packages`
Add items from package catalog into the load.
```json
{
  "packageDefinitionId": "uuid-pkg",
  "quantity": 12,
  "priority": 7,
  "stopSequence": 1
}
```

### `POST /api/loads/:id/placements`
Place or move an item inside the 3D trailer space.
```json
{
  "loadPackageId": "uuid-lp",
  "x": 1200,
  "y": 0,
  "z": 0,
  "rotationIndex": 0,
  "loadVersion": 3
}
```

### `GET /api/loads/:id/validation`
Execute full physics, collision, stackability, and center of gravity validation.

### `POST /api/loads/:id/auto-pack`
Trigger 3D spatial optimization packing algorithm.

### `GET /api/loads/:id/sequence`
Retrieve reversed LIFO loading sequence steps for warehouse workers.

---

## 5. Team Management (`/api/organization/members`)

- `GET /api/organization/members`: List team members
- `POST /api/organization/members/invite`: Invite member with assigned role
- `PATCH /api/organization/members/:id`: Change member role
- `DELETE /api/organization/members/:id`: Remove member from organization

