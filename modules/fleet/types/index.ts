export interface FleetVehicle {
  id: number;
  plateNumber: string;
  vehicleName: string | null;
  vehicleType: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

export interface FleetTrip {
  id: number;
  vehicleId: number;
  tripDate: string;
  driverName: string | null;
  startKm: number | null;
  endKm: number | null;
  distance: number | null;
  purpose: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface FleetRefuel {
  id: number;
  vehicleId: number;
  refuelDate: string;
  amount: number | null;
  cost: number | null;
  kmAtRefuel: number | null;
  fuelType: string | null;
  createdBy: string | null;
  createdAt: string;
}
