// app/lib/b2b/exports.ts
// Pure builders for the B2B CSV and Factur-X (CII / EN 16931) exports.
import { round2, unitCode, xmlEsc, type InvoiceLine } from './estimate';

export interface Party {
  name: string;
  vatId: string;
}

export function buildCsv({
  lines,
  net,
  vat,
  vatAmt,
  gross,
}: {
  lines: InvoiceLine[];
  net: number;
  vat: number;
  vatAmt: number;
  gross: number;
}): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    ['No', 'Description', 'UM', 'Qty', 'Unit price (EUR, excl. VAT)', 'Total (EUR, excl. VAT)'].map(q).join(';'),
    ...lines.map((l, i) => [i + 1, q(l.name), q(l.unit), l.qty, l.unitPrice.toFixed(2), l.total.toFixed(2)].join(';')),
    '',
    [q('Net total'), '', '', '', '', net.toFixed(2)].join(';'),
    [q(`VAT ${vat}%`), '', '', '', '', vatAmt.toFixed(2)].join(';'),
    [q('Gross total'), '', '', '', '', gross.toFixed(2)].join(';'),
  ];
  return rows.join('\r\n');
}

export function buildFacturX({
  lines,
  vat,
  invoiceNo,
  seller,
  buyer,
}: {
  lines: InvoiceLine[];
  vat: number;
  invoiceNo: string;
  seller: Party;
  buyer: Party;
}): string {
  const lineSum = round2(lines.reduce((s, l) => s + l.total, 0));
  const tax = round2(lineSum * (vat / 100));
  const total = round2(lineSum + tax);
  const issue = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // click handler → client only
  const party = (tag: string, p: { name: string; vatId: string }) => `
    <ram:${tag}>
      <ram:Name>${xmlEsc(p.name || 'N/A')}</ram:Name>
      <ram:PostalTradeAddress><ram:CountryID>RO</ram:CountryID></ram:PostalTradeAddress>${
        p.vatId ? `\n        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEsc(p.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''
      }
    </ram:${tag}>`;
  const lineXml = lines
    .map(
      (l, i) => `
  <ram:IncludedSupplyChainTradeLineItem>
    <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
    <ram:SpecifiedTradeProduct><ram:Name>${xmlEsc(l.name)}</ram:Name></ram:SpecifiedTradeProduct>
    <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${l.unitPrice.toFixed(2)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
    <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${unitCode(l.unit)}">${l.qty}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
    <ram:SpecifiedLineTradeSettlement>
      <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>${vat.toFixed(2)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${l.total.toFixed(2)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
    </ram:SpecifiedLineTradeSettlement>
  </ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
<rsm:ExchangedDocumentContext>
  <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
</rsm:ExchangedDocumentContext>
<rsm:ExchangedDocument>
  <ram:ID>${xmlEsc(invoiceNo || 'DRAFT')}</ram:ID>
  <ram:TypeCode>380</ram:TypeCode>
  <ram:IssueDateTime><udt:DateTimeString format="102">${issue}</udt:DateTimeString></ram:IssueDateTime>
</rsm:ExchangedDocument>
<rsm:SupplyChainTradeTransaction>${lineXml}
  <ram:ApplicableHeaderTradeAgreement>${party('SellerTradeParty', seller)}${party('BuyerTradeParty', buyer)}
  </ram:ApplicableHeaderTradeAgreement>
  <ram:ApplicableHeaderTradeDelivery/>
  <ram:ApplicableHeaderTradeSettlement>
    <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
    <ram:ApplicableTradeTax>
      <ram:CalculatedAmount>${tax.toFixed(2)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>
      <ram:BasisAmount>${lineSum.toFixed(2)}</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode>
      <ram:RateApplicablePercent>${vat.toFixed(2)}</ram:RateApplicablePercent>
    </ram:ApplicableTradeTax>
    <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      <ram:LineTotalAmount>${lineSum.toFixed(2)}</ram:LineTotalAmount>
      <ram:TaxBasisTotalAmount>${lineSum.toFixed(2)}</ram:TaxBasisTotalAmount>
      <ram:TaxTotalAmount currencyID="EUR">${tax.toFixed(2)}</ram:TaxTotalAmount>
      <ram:GrandTotalAmount>${total.toFixed(2)}</ram:GrandTotalAmount>
      <ram:DuePayableAmount>${total.toFixed(2)}</ram:DuePayableAmount>
    </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
  </ram:ApplicableHeaderTradeSettlement>
</rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
  return xml;
}
