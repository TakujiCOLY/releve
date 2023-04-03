import { Component, Inject, LOCALE_ID, OnInit, ViewChild } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';
import * as XLSX from 'xlsx';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { DatePipe, formatNumber } from '@angular/common';
pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  @ViewChild('fileImportInput') fileImportInput: any;
  records: any[] = [];
  beforeRecords: any[] = [];
  header: boolean = false;
  credit!: number;
  debit!: number;
  difference!: number;
  editForm!: FormGroup;
  submitted!: boolean;

  constructor(private primengConfig: PrimeNGConfig, private fb: FormBuilder, private datePipe: DatePipe, @Inject(LOCALE_ID) private locale: string) { }

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    this.credit = 0;
    this.debit = 0;
    this.difference = 0;
    this.initForm();
    this.submitted = false;
  }

  initForm(): void {
    this.editForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      adresse: ['', Validators.required],
      region: ['', Validators.required],
      pays: ['', Validators.required],
      compte: ['', Validators.required],
      dateAncienSolde: ['', Validators.required],
      ancienSolde: ['', Validators.required],
      natureCompte: ['', Validators.required],
      fichier: ['', Validators.required]
    });
  }

  readExcel(event: any): void {
    let file = event.target.files[0];
    let fileReader = new FileReader();
    fileReader.readAsBinaryString(file);
    fileReader.onload = (e) => {
      var workBook = XLSX.read(fileReader.result, { type: 'binary', cellDates: true });
      var sheetNames = workBook.SheetNames;
      this.beforeRecords = XLSX.utils.sheet_to_json(workBook.Sheets[sheetNames[0]]);
      this.beforeRecords = this.beforeRecords.sort(function (a: any, b: any) {
        return new Date(a).getTime() - new Date(b).getTime();
      });
      this.beforeRecords.forEach(element => {
        if (element['MNTDEV'] > 0) {
          this.credit += element['MNTDEV'];
        } else {
          this.debit += -element['MNTDEV'];
        }
      });
      console.log();
      this.editForm.patchValue({
        compte: this.beforeRecords[0]['COMPTE']
      });
      this.difference = this.credit - this.debit;
    }
  }

  loadInformations(): void {
    this.submitted = true;
    if (this.editForm.invalid) {
      return;
    }
    this.records = this.beforeRecords;
    this.difference += parseInt(this.editForm.value.ancienSolde, 10);
  }

  downloadPdf(): void {
    const pdfDefinition: any = {
      content: [
        {
          style: 'header',
          columns: [
            {
              text: 'NATURE : ' + this.editForm.value.natureCompte.toUpperCase()
            },
            [
              {
                table: {
                  widths: ['100%'],
                  body: [
                    ['Compte ' + this.editForm.value.compte + ' en FRANC CFA (XOF)'],
                    ['Relevé du ' + this.datePipe.transform(this.records[0]['DATOPER'], 'dd.MM.yyyy') + ' au ' + this.datePipe.transform(this.records[this.records.length - 1]['DATOPER'], 'dd.MM.yyyy')]
                  ]
                },
              },
              {
                text: '\n\n'
              },
              {
                table: {
                  widths: ['100%'],
                  body: [
                    [this.editForm.value.nom.toUpperCase() + '\n\n' + this.editForm.value.prenom.toUpperCase() + '\n\n' + this.editForm.value.adresse.toUpperCase() + '\n\n' + this.editForm.value.region.toUpperCase() + '\n' + this.editForm.value.pays.toUpperCase() + '\n\n']
                  ]
                }
              }
            ]
          ]
        },
        {
          text: '\n\n'
        },
        {
          style: 'header',
          table: {
            body: [
              ['Date', 'Libellé', 'Référence', 'Valeur', 'Débit', 'Crédit'],
              ['', 'Ancien solde compte au ' + this.editForm.value.dateAncienSolde, '', '', { text: this.editForm.value.ancienSolde < 0 ? formatNumber((-parseInt(this.editForm.value.ancienSolde, 10)), this.locale, '3.2-4') : '', style: 'column' }, { text: this.editForm.value.ancienSolde > 0 ? formatNumber((parseInt(this.editForm.value.ancienSolde, 10)), this.locale, '3.2-4') : '', style: 'column' }]
            ]
              .concat(this.records.map((record, i) => [this.datePipe.transform(record['DATOPER'], 'dd.MM'), record['LIBELLE'], record['NOOPER'], this.datePipe.transform(record['DATVAL'], 'dd.MM.yyyy'), { text: record['MNTDEV'] < 0 ? formatNumber((-record['MNTDEV']), this.locale, '3.2-4') : '', style: 'column' }, { text: record['MNTDEV'] > 0 ? formatNumber(record['MNTDEV'], this.locale, '3.2-4') : '', style: 'column' }]))
              .concat([['', 'Total des mouvements', '', '', '', '']])
              .concat([['', 'Nouveau solde au ' + this.datePipe.transform(this.records[0]['DATOPER'], 'dd.MM.yyyy'), '', '', { text: this.difference < 0 ? formatNumber((-this.difference), this.locale, '3.2-4') : '', style: 'column' }, { text: this.difference > 0 ? formatNumber(this.difference, this.locale, '3.2-4') : '', style: 'column' }]])
          }
        },
        {
          style: 'header',
          text: 'Sauf erreur omise'
        }
      ],
      styles: {
        header: {
          fontSize: 8,
          bold: false
        },
        column: {
          alignment: 'right'
        }
      }
    }

    const pdf = pdfMake.createPdf(pdfDefinition);
    pdf.open();
  }

  // getBody(): Array<[]> {
  //   let body:Array<[]> = [];
  //   let columns: any[] = ['Date', 'Libellé', 'Référence', 'Valeur', 'Débit', 'Crédit'];
  //   body.push(columns)
  //   return body;
  // }

}
