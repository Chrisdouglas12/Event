import mongoose from 'mongoose';

import {  ATTENDANCE_MODES, CURRENCIES, PARTICIPANT_STATUSES  } from '../constants/enums.ts';


// TICKET TYPE

const ticketTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 128,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  
    prices: [
      {
        currency: {
          type: String,
          enum: {
            values: CURRENCIES,
            message: 'Currency must be one of: NGN, USD, EUR, GBP',
          },
          required: true,
        },
        amountMinor: {
          type: Number,
          required: true,
          min: 0,
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'ticket_types' }
);

ticketTypeSchema.path('prices').validate(function (prices) {
  const seen = new Set();
  for (const p of prices) {
    if (seen.has(p.currency)) return false;
    seen.add(p.currency);
  }
  return true;
}, 'Duplicate currency in ticket prices');

ticketTypeSchema.pre('save', function () {
  if (Array.isArray(this.prices)) {
    this.prices.forEach((p) => {
      if (p.isModified && p.isModified('amountMinor')) {
        p.updatedAt = new Date();
      }
    });
  }
});



// GROUP

const groupSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    chapterZoneName: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    leaderName: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    leaderPhoneE164: {
      type: String,
      required: true,
      maxlength: 32,
      trim: true,
    },
    leaderEmail: {
      type: String,
      maxlength: 255,
      trim: true,
      lowercase: true,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    attendanceCounts: {
      physically: { type: Number, min: 0, default: 0 },
      online: { type: Number, min: 0, default: 0 },
      not_sure: { type: Number, min: 0, default: 0 },
    },
    claimedSeats: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    managementToken: {
      type: String,
      required: true,
      maxlength: 64,
      unique: true,
      trim: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'groups' }
);

groupSchema.pre('save', function () {
  this.updatedAt = new Date();
});


// PARTICIPANT

const participantSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    ticketTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketType',
      required: true,
    },
    refCode: {
      type: String,
      required: true,
      maxlength: 16,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    phoneE164: {
      type: String,
      required: true,
      maxlength: 32,
      trim: true,
    },
    email: {
      type: String,
      maxlength: 255,
      trim: true,
      lowercase: true,
    },
    country: {
      type: String,
      required: true,
      maxlength: 64,
      default: 'Nigeria',
      trim: true,
    },
    state: {
      type: String,
      maxlength: 64,
      trim: true,
    },
    chapterZone: {
      type: String,
      maxlength: 255,
      trim: true,
    },
    attendanceMode: {
      type: String,
      enum: {
        values: ATTENDANCE_MODES,
        message: 'Attendance mode must be one of: physically, online, not_sure',
      },
      required: true,
      default: 'not_sure',
    },
    isMinor: {
      type: Boolean,
      required: true,
      default: false,
    },
    guardianName: {
      type: String,
      maxlength: 255,
      trim: true,
    },
    guardianPhoneE164: {
      type: String,
      maxlength: 32,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: PARTICIPANT_STATUSES,
        message: 'Status must be one of: unconfirmed, confirmed, checked_in, booklet_issued',
      },
      required: true,
      default: 'unconfirmed',
    },
    qrTokenHash: {
      type: String,
      required: true,
      maxlength: 64,
      unique: true,
      trim: true,
    },
    checkedInAt:      { type: Date, default: null },
    bookletIssuedAt:  { type: Date, default: null },
    createdAt:        { type: Date, default: Date.now },
    updatedAt:        { type: Date, default: Date.now },
    deletedAt:        { type: Date, default: null }, 
  },
  { collection: 'participants' }
);

participantSchema.pre('save', function () {
  this.updatedAt = new Date();
});


// GROUP SEAT

const groupSeatSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    inviteCode: {
      type: String,
      required: true,
      maxlength: 32,
      unique: true,
      trim: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      default: null,
    },
    isClaimed: {
      type: Boolean,
      required: true,
      default: false,
    },
    claimedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'group_seats' }
);


// INDEXES

// Ticket types
ticketTypeSchema.index({ isActive: 1 });
ticketTypeSchema.index({ 'prices.currency': 1 });

// Groups
groupSchema.index({ orderId: 1 });

// Participants
participantSchema.index({ phoneE164: 1 });
participantSchema.index({ email: 1 });
participantSchema.index({ orderId: 1 });
participantSchema.index({ groupId: 1 });
participantSchema.index({ status: 1 });

participantSchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: { $type: 'date' } } }
);

// Group seats
groupSeatSchema.index({ groupId: 1 });
groupSeatSchema.index({ participantId: 1 });


// EXPORTS

export const TicketType = (mongoose.models.TicketType || mongoose.model('TicketType', ticketTypeSchema)) as mongoose.Model<any>;
export const Group = (mongoose.models.Group      || mongoose.model('Group',      groupSchema)) as mongoose.Model<any>;
export const Participant = (mongoose.models.Participant   || mongoose.model('Participant',   participantSchema)) as mongoose.Model<any>;
export const GroupSeat = (mongoose.models.GroupSeat  || mongoose.model('GroupSeat',  groupSeatSchema)) as mongoose.Model<any>;
