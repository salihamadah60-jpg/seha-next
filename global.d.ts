declare module 'moment-hijri' {
  import moment from 'moment';
  // Minimal shim: treat as moment export with Hijri plugin applied
  const momentHijri: typeof moment;
  export default momentHijri;
}